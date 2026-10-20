"""Marionette: a 3D posing editor for rigged models (GLB / VRM / FBX).

Works on Forge, reForge and Forge Neo (and A1111). The editor is a static
Three.js app served by the WebUI's FastAPI server and embedded via iframe, so it
does not depend on the Gradio version each fork ships.
"""
import base64
import io
import json
import os
import sys
import threading

import gradio as gr
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from modules import paths, script_callbacks, scripts

EXT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB_DIR = os.path.join(EXT_DIR, "web")


class _FreshStatic(StaticFiles):
    """The editor's own files. The page is loaded from /rigged-pose/v<version>/,
    a path that changes with every update of the extension, so a browser can
    never mix cached modules of an older version with new ones; the version
    segment is dropped here. Every file is also revalidated (no-cache)."""

    async def get_response(self, path, scope):
        parts = path.replace("\\", "/").split("/", 1)
        if len(parts) == 2 and parts[0][:1] == "v" and parts[0][1:].isdigit():
            path = parts[1]
        resp = await super().get_response(path, scope)
        resp.headers["Cache-Control"] = "no-cache"
        return resp


def _web_version():
    # Newest file time under web/: changes whenever the extension is updated.
    newest = 0
    for root, _dirs, files in os.walk(WEB_DIR):
        for f in files:
            try:
                newest = max(newest, os.path.getmtime(os.path.join(root, f)))
            except OSError:
                pass
    return str(int(newest))


MODEL_DIRS = {
    "ext": os.path.join(EXT_DIR, "models"),
    "user": os.path.join(paths.models_path, "RiggedPose"),
}
MODEL_EXTS = (".glb", ".gltf", ".vrm", ".fbx")


def list_models():
    out = []
    for key, root in MODEL_DIRS.items():
        if not os.path.isdir(root):
            continue
        for dirpath, _dirs, files in os.walk(root):
            for name in sorted(files):
                if not name.lower().endswith(MODEL_EXTS):
                    continue
                rel = os.path.relpath(os.path.join(dirpath, name), root).replace(os.sep, "/")
                out.append({"name": rel, "url": f"../rigged-pose-files/{key}/{rel}"})
    return out


# ---------------------------------------------------------------- pose detection
# Forge / reForge / Neo ship ControlNet without the /controlnet/detect API, so
# the editor asks us instead. We call whatever OpenPose / DWPose annotator the
# WebUI already has (Forge's legacy preprocessors or sd-webui-controlnet), or the
# controlnet_aux package, and answer with OpenPose JSON (pixel coordinates).

_det_lock = threading.Lock()
_detectors = {}


def _annotator_roots():
    base = getattr(paths, "script_path", os.getcwd())
    roots = []
    for parent in ("extensions-builtin", "extensions"):
        d = os.path.join(base, parent)
        if not os.path.isdir(d):
            continue
        for name in sorted(os.listdir(d)):
            root = os.path.join(d, name)
            if os.path.isfile(os.path.join(root, "annotator", "openpose", "__init__.py")):
                roots.append(root)
    # Forge's legacy preprocessors first, then anything else that has them.
    roots.sort(key=lambda r: 0 if "forge_legacy_preprocessors" in r else 1)
    return roots


def _annotator_detector():
    try:
        from annotator.openpose import OpenposeDetector  # noqa: F401
    except Exception:
        for root in _annotator_roots():
            if root not in sys.path:
                sys.path.insert(0, root)
            try:
                from annotator.openpose import OpenposeDetector  # noqa: F811
                break
            except Exception:
                continue
        else:
            return None
    from annotator.openpose import OpenposeDetector
    return OpenposeDetector()


def _detect_annotator(img, dw, hands, face):
    det = _detectors.get("annotator")
    if det is None:
        det = _annotator_detector()
        if det is None:
            raise RuntimeError("no OpenPose annotator found in the WebUI")
        _detectors["annotator"] = det
    out = {}

    def cb(poses):
        out["poses"] = json.loads(poses) if isinstance(poses, str) else poses

    try:
        det(img, include_body=True, include_hand=hands, include_face=face, use_dw_pose=dw, json_pose_callback=cb)
    except TypeError:  # older annotators without DW / json callback arguments
        det(img, include_body=True, include_hand=hands, include_face=face, json_pose_callback=cb)
    if "poses" not in out:
        raise RuntimeError("the annotator returned no keypoints")
    return out["poses"]


def _detect_aux(img, hands, face):
    det = _detectors.get("aux")
    if det is None:
        from controlnet_aux import OpenposeDetector as AuxDetector
        det = AuxDetector.from_pretrained("lllyasviel/Annotators")
        _detectors["aux"] = det
    H, W = img.shape[:2]
    poses = det.detect_poses(img, include_hand=hands, include_face=face)

    def flat(kps, n):
        vals = []
        for i in range(n):
            k = kps[i] if kps is not None and i < len(kps) else None
            vals += [float(k.x) * W, float(k.y) * H, float(getattr(k, "score", 1.0) or 1.0)] if k is not None else [0.0, 0.0, 0.0]
        return vals

    people = []
    for p in poses:
        people.append({
            "pose_keypoints_2d": flat(p.body.keypoints, 18),
            "hand_left_keypoints_2d": flat(p.left_hand, 21) if p.left_hand else [],
            "hand_right_keypoints_2d": flat(p.right_hand, 21) if p.right_hand else [],
            "face_keypoints_2d": flat(p.face, 70) if p.face else [],
        })
    return {"people": people, "canvas_width": W, "canvas_height": H}


def detect_pose(data):
    import numpy as np
    from PIL import Image

    raw = data.get("image", "")
    if "," in raw[:100]:
        raw = raw.split(",", 1)[1]
    img = Image.open(io.BytesIO(base64.b64decode(raw))).convert("RGB")
    limit = int(data.get("max_side", 1024))
    if max(img.size) > limit:
        img.thumbnail((limit, limit))
    arr = np.array(img)
    hands, face = bool(data.get("hands", True)), bool(data.get("face", True))
    errors = []
    with _det_lock:
        for name, fn in (("dwpose", lambda: _detect_annotator(arr, True, hands, face)),
                         ("openpose", lambda: _detect_annotator(arr, False, hands, face)),
                         ("controlnet_aux", lambda: _detect_aux(arr, hands, face))):
            try:
                poses = fn()
                if poses and poses.get("people") is not None:
                    poses.setdefault("canvas_width", arr.shape[1])
                    poses.setdefault("canvas_height", arr.shape[0])
                    return {"ok": True, "detector": name, "pose": poses}
            except Exception as e:  # try the next detector
                errors.append(f"{name}: {e}")
    return {"ok": False, "error": "; ".join(errors) or "no detector available"}


def on_app_started(_demo, app):
    routes = app.router.routes
    first_new = len(routes)

    @app.get("/rigged-pose-api/models")
    def _models():
        return JSONResponse(list_models())

    @app.post("/rigged-pose-api/detect")
    def _detect(payload: dict):
        try:
            res = detect_pose(payload)
        except Exception as e:
            res = {"ok": False, "error": str(e)}
        return JSONResponse(res, status_code=200 if res.get("ok") else 422)

    for key, root in MODEL_DIRS.items():
        os.makedirs(root, exist_ok=True)
        app.mount(f"/rigged-pose-files/{key}", StaticFiles(directory=root), name=f"rigged-pose-files-{key}")
    app.mount("/rigged-pose", _FreshStatic(directory=WEB_DIR, html=True), name="rigged-pose")

    # Move our routes ahead of any catch-all route the Gradio app registered.
    ours = routes[first_new:]
    del routes[first_new:]
    routes[0:0] = ours


def frame_html(ctx, height):
    # data-src: the bridge script only loads the iframe once it becomes visible,
    # so closed accordions don't each hold a WebGL context.
    return (
        f'<iframe class="rigged-pose-frame" data-src="rigged-pose/v{_web_version()}/index.html?ctx={ctx}" '
        f'style="width:100%;height:{height};border:0;border-radius:8px;display:block" '
        f'allow="clipboard-write"></iframe>'
    )


def on_ui_tabs():
    with gr.Blocks(analytics_enabled=False) as tab:
        gr.HTML(frame_html("tab", "calc(100vh - 160px)"), elem_id="rigged_pose_tab_frame")
    return [(tab, "Marionette", "rigged_pose")]


script_callbacks.on_app_started(on_app_started)
script_callbacks.on_ui_tabs(on_ui_tabs)


class RiggedPoseScript(scripts.Script):
    def title(self):
        return "Marionette 3D Pose"

    def show(self, is_img2img):
        return scripts.AlwaysVisible

    def ui(self, is_img2img):
        tab = "img2img" if is_img2img else "txt2img"
        with gr.Accordion("Marionette 3D Pose", open=False, elem_id=f"rigged_pose_{tab}"):
            gr.HTML(frame_html(tab, "720px"))
            with gr.Row():
                auto_tags = gr.Checkbox(
                    label="Append camera shot tags to the prompt on Generate",
                    value=False,
                    elem_id=f"rigged_pose_autotags_{tab}",
                )
            # Hidden through CSS rather than visible=False: Gradio 4 does not
            # render invisible components, and the bridge needs the textarea.
            state = gr.Textbox(
                value="{}",
                show_label=False,
                elem_id=f"rigged_pose_state_{tab}",
                elem_classes=["rigged-pose-hidden"],
            )
        self.infotext_fields = []
        return [auto_tags, state]

    @staticmethod
    def _tags(state):
        try:
            return (json.loads(state or "{}").get("tags") or "").strip()
        except (ValueError, AttributeError):
            return ""

    @staticmethod
    def _append(prompt, tags):
        if not tags or tags in (prompt or ""):
            return prompt
        prompt = (prompt or "").rstrip().rstrip(",")
        return f"{prompt}, {tags}" if prompt else tags

    def before_process(self, p, auto_tags=False, state="{}", *args):
        tags = self._tags(state)
        if not auto_tags or not tags:
            return
        p.prompt = self._append(p.prompt, tags)
        if getattr(p, "hr_prompt", None):
            p.hr_prompt = self._append(p.hr_prompt, tags)
        p.extra_generation_params["Marionette shot"] = tags

    def process(self, p, auto_tags=False, state="{}", *args):
        # Safety net for forks where prompts were expanded before before_process.
        tags = self._tags(state)
        if not auto_tags or not tags or not getattr(p, "all_prompts", None):
            return
        p.all_prompts = [self._append(x, tags) for x in p.all_prompts]
        if getattr(p, "all_hr_prompts", None):
            p.all_hr_prompts = [self._append(x, tags) for x in p.all_hr_prompts]
