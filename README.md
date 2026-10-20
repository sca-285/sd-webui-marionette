# Marionette: 3D Pose cho Forge / reForge / Forge Neo



Editor tạo dáng 3D dùng **model thật có rig** (GLB, VRM, FBX Mixamo, VRoid, Rigify, UE). Chụp từ góc camera bạn đặt, xuất ra map ControlNet: **OpenPose (kèm tay), Depth, Normal, Canny/Lineart, Mask, Shaded**.

- Tab riêng **Marionette** (editor lớn).
- Accordion riêng **Marionette 3D Pose** trong txt2img và img2img, nằm ngoài ControlNet.
- Các editor đồng bộ pose, camera và model với nhau (tắt được).

## Cài đặt
Chép cả thư mục vào `extensions/` (hoặc *Extensions → Install from URL* nếu bạn push lên git), rồi restart WebUI. Không cần build, không cần mạng: three.js và three-vrm đã kèm sẵn trong `web/vendor`.

Model: bỏ vào `extensions/sd-webui-marionette/models/` hoặc `models/RiggedPose/`. Cũng mở trực tiếp được bằng nút *Open file*.

**Nâng cấp từ bản "Rigged Pose Editor":** xoá thư mục cũ `extensions/sd-webui-rigged-pose` trước khi chép thư mục mới, nếu không sẽ có hai tab trùng nhau. Model trong thư mục `models/` cũ thì chép sang. Cảnh, pose và setting đã lưu vẫn giữ nguyên.

- **Cập nhật:** xoá hẳn thư mục extension cũ rồi giải nén bản mới, sau đó **khởi động lại WebUI** (Reload UI không nạp lại code Python). Từ bản này, editor được nạp từ một đường dẫn đổi theo mỗi phiên bản, nên trình duyệt không còn giữ file JS cũ. Riêng lần đầu cập nhật lên bản này, nếu vẫn thấy giao diện cũ thì bấm Ctrl+F5.
- Đừng cài song song hai bản (ví dụ `sd-webui-rigged-pose` và `sd-webui-marionette`): cả hai dùng chung đường dẫn, nên bản nào nạp trước sẽ được dùng.

## Giao diện theo tab
- Bảng bên phải chia thành **tab** (Model, Pose, Props, Camera, Light, Output, Prefs) thay vì một cột accordion dài.
- Ô **Find a setting** (phím `/`): gõ tên bất kỳ nút hoặc tùy chọn (không cần dấu), Enter để nhảy thẳng tới.

## Model người có sẵn và Extras
- Thêm 2 model **Female · realistic** và **Male · realistic** (Human Base Meshes, CC0), đã rig sẵn 52 xương kiểu Mixamo, đủ 10 ngón. Các thân hình stylised trong gói không được đưa vào vì tỷ lệ cơ thể trông như trẻ em.
- **Extras · any model** (tab Model) dùng được cho mọi model, kể cả ma-nơ-canh:
  - **Sừng**: nhỏ, quỷ, cừu, oni, gạc nai.
  - **Tai thú**: mèo, cáo, sói, thỏ, gấu, tai elf (theo màu tóc).
  - **Bộ phận sinh dục** (người lớn): nam (Flaccid/Erect, kích cỡ), nữ, lông mu. Đi theo xương hông nên pose nào cũng khớp, được lưu cùng scene.

## Control kiểu Maya
- Mỗi khớp có một **vòng tròn control** bao quanh, vuông góc với xương, cỡ vừa ôm chi.
- Màu mặc định: trái xanh dương, giữa đỏ, phải xanh lá. Đổi sang kiểu cũ (trái xanh / giữa vàng / phải đỏ) ở *Pose → Control colours*.
- Click vào vòng để chọn xương. Vòng quá nhỏ (ngón tay) thì click vào tâm khớp cũng chọn được.
- **`H` (Pose mode) hoặc nút *Controls*:** ẩn/hiện toàn bộ control. Gizmo của xương đang chọn vẫn giữ nguyên.
- **Click thẳng lên thân** nhân vật đang chọn sẽ chọn xương gần chỗ click nhất, kể cả khi control đang ẩn.
- **Vòng gốc (root):** vòng lớn màu vàng trên sàn dưới chân, có 4 mũi tên (mũi dài chỉ hướng mặt). Chọn vòng này thì di chuyển (`W`/`G`) và xoay (`E`, hoặc `R` ở bộ phím Blender) cả nhân vật như một object, dáng giữ nguyên. Tâm xoay là điểm trên sàn dưới hông, nên xoay quanh trục đứng thì chân vẫn trên sàn. *Reset bone* khi đang chọn vòng gốc đưa nhân vật về gốc toạ độ, quay mặt về +Z.

## Giới hạn khớp theo giải phẫu
Bật mặc định (*Pose → Anatomical joint limits*), áp dụng khi xoay bằng gizmo, phím `R`, IK, preset, pose từ ảnh và Flip depth.

| Khớp | Biên độ |
|---|---|
| Khuỷu | gập 0–150°, không gập ngược; xoay cẳng tay ±85° |
| Gối | gập 0–155°, không gập ra trước |
| Vai | giơ trước/lên ~170°, ra sau 60°, ra sau lưng 40°, vắt ngang ngực 135°; xoay trục ±85° |
| Hông | gập 125°, duỗi 25°, dạng 50°, khép 25°; xoay ±45° |
| Cột sống | gập 80°, ngửa 30°, nghiêng 35°, vặn 45° (chia đều cho các đốt) |
| Cổ + đầu | gập ~80°, ngửa ~80°, nghiêng ~60°, quay ~85° |
| Cổ tay, cổ chân, ngón tay, ngón chân | biên độ riêng từng khớp |

- Bẻ cẳng tay hay cẳng chân sang ngang (hướng khớp bản lề không cho phép) thì cánh tay trên hay đùi sẽ tự xoay trục để bù, giống cơ thể thật.
- IK hai xương giờ giải bằng hình học: gối và khuỷu luôn gập về phía pole, không bao giờ gập ngược.
- Tắt checkbox để tạo dáng tự do. Bật lại thì pose hiện tại được đưa về trong giới hạn (Ctrl+Z để hoàn tác).


## Scene: mới, lưu, mở, khôi phục
Ở đầu bảng **Model**:
- **New scene**: bắt đầu lại với một nhân vật mặc định, không có prop. Có hỏi xác nhận trước.
- **Save…**: tải cả cảnh về thành file `.json`, gồm nhân vật, dáng, prop và camera.
- **Open…**: mở một file cảnh `.json`.
- **Restore previous**: lấy lại cảnh vừa bị thay. Trước mỗi lần New hoặc Open, cảnh hiện tại được tự động sao lưu; bấm lần nữa để đổi qua lại.
- Model mở trực tiếp từ file máy (*Open file*) không nằm trong file cảnh, cần mở lại sau khi load.

## Cảnh nhiều nhân vật và Outliner
- **Outliner** là cửa sổ nổi trên viewport (kéo được, thu gọn được), chia 4 nhóm: **Characters / Environment / Props / Camera**.
  - Click vào một dòng để chọn; double-click để đổi tên.
  - Mỗi dòng có nút ẩn/hiện, khoá (khoá rồi thì không click chọn được trong viewport) và menu `⋯` (nhân bản, xoá, reset, chuyển giữa Environment và Props).
- **Nhiều nhân vật:** nút `+` thêm người mới, mỗi người có thân hình, dáng và màu vùng riêng.
  - Click vào thân một người trong viewport là chuyển sang tạo dáng người đó.
  - `Ctrl+Z` tự quay về đúng người vừa sửa.
  - OpenPose xuất đủ mọi người.
  - Composer có thêm mục *Subject: All characters* để đóng khung cả nhóm.
- **Màu giao diện theo WebUI:** đọc các biến màu của Gradio, nên tự theo Lobe Theme / Lobe Theme Redux hay theme khác, kể cả khi đổi màu lúc đang chạy. Màu nửa trong suốt được trộn đúng lên nền, và nếu chữ không đủ tương phản thì tự đổi sang màu nền dễ đọc.

## IK và tiếp xúc
- **Pole:** ở IK mode, các hình thoi nhỏ quy định hướng gập của khuỷu và gối.
- **Pin feet:** khi di chuyển hoặc xoay hông, chân giữ nguyên trên sàn (dùng để ngồi xổm, khom người).
- **Live mirror:** tạo dáng một bên, bên kia tự đối xứng theo.
- **IK targets stick to surfaces:** tay hoặc chân thả gần mặt prop sẽ tự đặt lên đó (tay lên bàn, chân lên bậc).
- **Stand on surface:** đưa nhân vật đứng lên bục hay cầu thang. **Sit on prop below:** ngồi lên ghế/giường/sofa bên dưới hông, chân tự tìm sàn.
- **Auto balance** (tắt mặc định): khi tạo dáng phần thân trên, hông tự dịch để trọng tâm cơ thể luôn nằm trên hai bàn chân đang chạm sàn, chân giữ nguyên chỗ. Kiểu AutoPosing của Cascadeur, bản nhẹ dựa trên quy tắc.
- **Spine follows a reaching hand** (bật mặc định): kéo IK target của tay ra xa quá tầm với thì cột sống cúi và nghiêng theo, trong giới hạn khớp.

## Thư viện pose (`L`)
- **Khoảng 360 pose có ảnh xem trước**, chia theo mục (thanh mục ở đầu thư viện):
  - Basics.
  - Standing & everyday.
  - Action & fighting: đấm, đá, đỡ, né, bị hất văng, tiếp đất kiểu siêu anh hùng…
  - Midair, jumps & flying: nhảy, lộn nhào, trồng cây chuối, bay, rơi, lặn, lơ lửng…
  - Ground: bò, trườn, nằm, quỳ, ngồi bệt, yoga…
  - Weapons.
  - Everyday props.
  - Fashion & studio.
  - Seats, walls & steps.
- Pose là **toàn thân**: hông (nghiêng, xoay, độ cao, lơ lửng), lưng/eo, ngực, cổ, đầu, vai, tay, cổ tay, bàn tay, chân, bàn chân. Mỗi pose tự đặt người chạm sàn đúng chỗ.
- **Fashion & studio** (68 pose, có nhiều pose nam): chân bất đối xứng, khụy gối chân trụ, vắt chân, dựa tường, ngồi ghế đẩu…
- **Đá** (thẳng, ngang, vòng cầu, đá cao, đá bay) được làm lại: gối hơi chùng, chân trụ xoay, thân ngả ngược, tay thủ. Hết vụ chân bị vặn.
- **Pose có điểm tựa** tự mang theo ghế, ghế đẩu, sofa, giường, bàn, tường, bậc thang, thùng gỗ… đặt đúng vị trí. Thân người tự **ngồi lên mặt** ghế/giường/thùng theo tỷ lệ của model, chân gần sàn tự đặt xuống sàn, tay/chân đặt lên prop bằng IK, nên gần như không còn xuyên mesh (≤1 cm với đa số pose). Mỗi nhân vật có một món, đổi pose thì món cũ được thay.
- **18+**: bật ô `18+` để hiện mục pose người lớn (65 pose solo, nam và nữ, chỉ dành cho nhân vật người lớn). Mặc định ẩn; lựa chọn được nhớ trong trình duyệt.
  - Nữ: thủ dâm nằm ngửa, fingering (quỳ, ngồi, đứng dựa tường), ngón móc "come hither", chân chữ M, ôm gối dạng chân, banh mông (cúi, úp ngực, nằm sấp), exhibition đứng/ngồi xổm, ghế, bàn…
  - Nam: vuốt (đứng, ngửa đầu, ghế, nằm, quỳ, ngồi xổm, dựa tường), exhibition nằm dạng chân, ngả trên khuỷu, chổng mông.
  - Ngón tay được canh chạm đúng chỗ (sai số khoảng 1–2 cm). Pose vuốt của nam giả định chế độ *Erect* trong Extras.
- **Hand poses**: tab riêng gồm 53 dáng tay (thêm fingering một/hai ngón, móc, xoa, banh, nắm vuốt, bóp ngực), mỗi dáng có ảnh cận. Có các nhóm: thả lỏng, nắm, chỉ, chữ V, OK, like, rock, shaka, đếm 1–5, nhón, vuốt, tim ngón tay, dáng tay mềm mại… Chọn tay trái, phải hoặc cả hai. Các dáng này cũng có trong ô *Hand pose…* của bảng Pose.
- **Save current pose…**: lưu dáng nhân vật đang chọn kèm tên, tag, ảnh nhỏ và prop đang cầm. Tìm theo tên hoặc tag.
- **Apply to**: áp cả người, chỉ thân trên, chỉ thân dưới, tay + bàn tay, chỉ bàn tay, hoặc đầu + cổ. Áp một phần thì phần đó đi theo thân hiện tại. **Mirrored** để áp đối xứng.
- Pose lưu theo hệ của nhân vật nên áp ở đâu, quay hướng nào cũng đúng.
- **Export / Import** thư viện ra file `.json` để chia sẻ hoặc sao lưu.
- **Pose vũ khí**:
  - Có pose đứng yên lẫn pose hành động cho kiếm, katana, greatsword, song kiếm, đao, song đao, dao găm, trượng, archistaff, thương, lưỡi hái, rìu, cung, các loại súng, blaster, beam saber, đũa phép, khiên…
  - Có cả pose nằm ngắm, trườn kèm súng, lết bắn, lăn né, chém trên không.
  - **Idle** riêng cho từng loại vũ khí (24 pose): vác vai, chống kiếm, cầm súng chúc nòng…
  - Tay đỡ súng giờ nắm đúng ốp nòng. Pose kéo cung dùng mesh **cung đang giương** (dây gập chữ V về tay kéo, tay neo ở cằm).
  - Bật **With props** thì prop tự vào đúng tay, và **ngón tay ôm quanh cán** (ngón trỏ đặt lên cò súng).
  - Với vũ khí hai tay, tay thứ hai tự nắm vào cán hoặc ốp nòng.
  - Đổi sang pose vũ khí khác thì prop do pose trước tạo ra được thay. Prop bạn tự thêm chỉ được thả ra, không bị xoá.

## Animation
- Clip có sẵn trong model FBX/GLB hiện trong danh sách *Animation* (bảng Pose).
- **Load…**: mở file animation riêng (FBX/GLB, ví dụ Mixamo "without skin"). Clip được **retarget** lên nhân vật đang chọn, kể cả ma-nơ-canh; có bù chênh lệch tư thế gốc (T-pose / A-pose).
- Kéo thanh thời gian để chọn khung hình, ▶ để phát. *Keep the character where it stands* bỏ chuyển động trôi của gốc (root motion).
- **Save frame to pose library**: lưu khung hình đang chọn vào thư viện.

## Mặt
70 điểm mặt theo chuẩn OpenPose. Có slider mở miệng, cười, nhắm mắt, nhướng mày; nút **Head → camera**; tuỳ chọn **Eyes follow camera** (con ngươi luôn nhìn ống kính). Mặt quay đi thì các điểm khuất tự ẩn. Ma-nơ-canh không có lưới mặt: biểu cảm chỉ tác động lên keypoint.

## Tỷ lệ khung hình
- Camera và Output có nút tỷ lệ **1:1, 2:3, 3:4, 9:16 (portrait), 3:2, 4:3, 16:9 (landscape)**, nút ⇄ để đổi dọc/ngang. Giữ nguyên số pixel, làm tròn bội số 64 (ví dụ landscape 1216×832). Khi bật *Follow WebUI width/height*, width/height của WebUI cũng đổi theo.

## Gửi sang ControlNet
- Khi bật **Set ControlNet type, preprocessor and model on Send** (tab Output, mặc định bật), Capture & Send tự chọn **Control Type** đúng với pass (OpenPose, Depth, Normal, Canny, Seg), đặt **Preprocessor = None** (vì ảnh đã là map sẵn) và chọn model hợp nếu unit chưa có model.

## Camera như một object
- **Select camera** / **Select aim point** (bảng Camera), hoặc click lên camera hay điểm nhắm (hình thoi cam) trong view tự do / trực giao.
- Camera: `W`/`G` dời (cả điểm nhắm đi theo, trừ khi bật *keeps its aim point* thì xoay quanh điểm nhắm), `E`/`R` quay ngang dọc tại chỗ.
- Điểm nhắm (focal point): `W`/`G` dời, camera tự quay theo.
- Ô số cho vị trí, điểm nhắm, tiêu cự (mm), khoảng cách tới điểm nhắm (dolly), near / far clip.
- **Nhiều camera** (mục *Cameras* trong Outliner):
  - **+** thêm camera ở góc của view tự do đang xem, hoặc cạnh camera hiện tại.
  - Click một camera để nó thành **camera active** (camera dùng để render) và nhìn qua nó.
  - Các nút trên mỗi dòng giống character và props: mắt (ẩn/hiện khung camera), khoá, `•••` (Look through, Move / turn, Frame active character, Align to free view, Duplicate, Delete). Double-click để đổi tên.
  - Camera **bị khoá** giữ nguyên khung hình: không orbit, không gizmo, không tự đóng khung.
  - Camera không active hiện thành khung màu trong view tự do; click vào để chuyển sang nó.
  - Danh sách camera được lưu theo scene, đồng bộ giữa các editor và giữ lại khi tải lại trang.

## Ánh sáng (bảng Lighting)
- **3 đèn** Key / Fill / Rim cùng ánh sáng môi trường (màu trời / đất). Mỗi đèn chỉnh hướng, độ cao, cường độ, màu, bật/tắt.
- **Quả cầu hướng sáng** kiểu PoseMy.Art: click đặt đèn chiếu từ nửa trước, Shift+click từ phía sau, kéo để rê.
- **Preset**: Studio 3-point, Rembrandt, Loop, Butterfly, Split, Rim/backlight, Top, Under, Golden hour, Moonlight.
- **Shadows**: đèn Key đổ bóng, cả xuống sàn.
- **Lights follow the camera**: hướng đèn tính theo góc máy, nên quay camera vẫn giữ nguyên ánh sáng.
- **Tay cầm đèn** trong view tự do / trực giao: click bóng đèn rồi `W`/`G` kéo đèn quanh chủ thể.
- Pass *Shaded* render bằng chính các đèn này (có bóng); pass *Light (IC-Light)* mặc định theo hướng đèn Key.

## Pass mới
- **Segmentation (ADE20K):** người, tường, sàn, ghế, giường, sofa... đúng màu lớp ADE20K, pixel sắc nét không pha màu. Mỗi prop chọn được lớp riêng (*Seg class*).
- **Region map + person masks:** mỗi người một màu, kèm mask riêng từng người, dùng cho Regional Prompter / Forge Couple.
- **Light (IC-Light):** đổ bóng từ một nguồn sáng, chỉnh hướng và độ cao theo góc nhìn camera.
- **Hands: depth / mask / OpenPose:** chỉ riêng bàn tay. Depth giãn theo độ sâu của riêng tay nên rõ nét; mask trắng ở tay, chỗ bị che thì đen. Dùng cho depth hand refiner, inpaint hoặc ADetailer khi sửa tay.
- **ControlNet preset:** chọn bộ (Pose + Depth, + Canny, Seg, Union, Regions, IC-Light) rồi Apply; tự gán unit và đặt weight. Preprocessor của từng unit vẫn phải tự đặt về *None*.

## Pose từ ảnh
- **Detect from image:** extension tự nhận diện pose ở phía server, dùng DWPose/OpenPose có sẵn trong WebUI (Forge legacy preprocessors hoặc sd-webui-controlnet, hoặc gói `controlnet_aux`). Không cần `--api`, chạy được trên Forge / reForge / Neo. Lần đầu có thể mất thời gian tải model DWPose. Nếu không được, editor thử tiếp API `/controlnet/detect` của sd-webui-controlnet.
- Nhận diện tốt hơn với người **ngả ra sau, nằm ngửa, bật ngửa**, và không còn tự ngửa cổ khi ảnh không ngửa (sai lệch góc đầu trung bình từ ~19° xuống ~5°).
- **OpenPose JSON:** mở file JSON từ editor hoặc preview của ControlNet (hỗ trợ COCO-18 và BODY_25).
- Dáng được dựng 3D theo góc camera hiện tại. Ảnh nhiều người thì mỗi người ghép với một nhân vật, theo thứ tự trái sang phải.
- Một ảnh không phân biệt được trước/sau, nên với tay hoặc chân bị sai, chọn xương đó và bấm **Flip depth** (`D`): đổi trước/sau mà hình 2D không đổi.
- **Ảnh tham chiếu:** hiện mờ trên khung hình, có thể lấy "Last generated" từ gallery. Ảnh này không đi vào ảnh xuất.
  - Ảnh dùng để detect chỉ được giữ làm tham chiếu khi bật *Keep the photo as a see-through reference*.
  - Gỡ ảnh bằng nút **Remove photo** cạnh nút detect, hoặc nút **Reference photo ✕** trên viewport.

## Ma-nơ-canh có tham số (bảng Body)
Thân dựng từ các khối SDF hoà trộn mượt, có skin thật, nên ngực, eo, hông, mông nối liền và biến dạng theo pose.

**Skin weight:** chuyển tiếp giữa hai xương đặt đúng tại khớp, mỗi khớp một độ rộng riêng: rộng ở hông và vai, gọn ở cổ tay, ngón chân. Nếp bẹn chạy chéo, cằm đi theo đầu, cổ tay đi theo bàn tay. Sau đó trọng số được làm mượt trên lưới, nên không còn nếp gãy ở khuỷu, gối, vai.

**Detail** (đầu bảng Body):
| Mức | Mô tả | Dựng lại |
|---|---|---|
| **Simple** | Khối rời gắn cứng vào từng xương, kiểu ma-nơ-canh gỗ | ~0,15 s |
| **Standard** (mặc định) | Thân liền, có skin | ~0,4 s |
| **High** | Lưới dày khoảng 3,5 lần (khoảng 230–260 nghìn tam giác). Thêm giải phẫu: xương đòn, cơ thang, bả vai, cơ cổ, xương bánh chè, mắt cá, gót, cơ cẳng tay; mặt có hốc mắt, nhãn cầu, mí, cung mày, gò má, mũi, môi, cằm; lòng bàn tay nặn khối, có đốt ngón. Mọi đỉnh được chiếu đúng lên bề mặt, normal tính trực tiếp, nên depth/normal mượt, không bậc thang | ~2–2,5 s; slider chỉ dựng lại khi thả chuột |

Đổi Detail không làm mất dáng; mỗi nhân vật có Detail riêng.
- **Preset** Female / Male / Neutral, cùng các slider: vai, cơ ngực, ngực, eo, hông, mông, đùi, cơ bắp, bụng.
- **Giải phẫu:** núm vú, lông mu, bộ phận sinh dục nữ, hoặc nam (flaccid / erect, chỉnh kích thước; dương vật có 2 xương để tạo dáng).
- **Tóc** (chia nhóm, dùng được cho mọi dáng người):
  - Ngắn: buzz cut, crew cut, short, side part, slicked back, quiff, pompadour, undercut, spiky, mohawk.
  - Trung bình / dài: afro, mullet, bob, long.
  - Buộc: man bun, bun, ponytail, twintails.
  - Tuỳ chọn mái. Ponytail và twintails có xương riêng.
- **Râu** (*Facial hair*): ria mép, râu dê, râu ngắn, râu rậm.
- **Núm vú** nằm đúng đỉnh ngực hoặc cơ ngực, khoảng cách tự co giãn theo độ rộng ngực (khoảng 18–20 cm ở người cao 1,72 m).
- **Phần phụ:** 4 hoặc 6 tay, cánh lông vũ hoặc cánh dơi (có preset Spread / Raised / Folded / Half open), đuôi 5 đốt.
- Xương phụ có chấm tròn màu tím. Mirror, lưu và load pose đều áp dụng cho chúng.
- OpenPose có thể vẽ thêm tay phụ (*OpenPose: extra arms*). Cánh, đuôi, tóc và bộ phận sinh dục chỉ hiện trên depth, normal, canny và mask, vì OpenPose không có keypoint cho chúng.

## Props & modeling (kiểu Blender)
Ba mode trên thanh công cụ: **Pose** (tạo dáng nhân vật), **Object** (đặt và biến đổi prop), **Edit** (sửa mesh của prop đang chọn; `Tab` để chuyển qua lại).

- **Thư viện có sẵn**, kích thước thật theo mét:
  - Hình cơ bản: cube, plane, cylinder, sphere, cone, torus, wedge.
  - Phòng: floor, wall, doorway, window, stairs, platform, pillar, ramp.
  - Nội thất: chair, stool, table, bed, bench, sofa, crate, desk.
  - **Blades:** sword, dual swords, jian, greatsword, dao, dual dao, katana, rapier, dagger, dual daggers.
  - **Staves & polearms:** short staff, archistaff, spear, scythe.
  - **Axes:** hatchet, short axe, long axe, dual hatchets.
  - **Bows:** bow, bow + quiver, quiver, arrow, bow + arrow.
  - **Firearms:** pistol, dual pistols, magnum, revolver, rifle, sniper rifle, shotgun.
  - **Sci-fi & fantasy:** blaster, blaster rifle, beam saber (đơn / đôi), wand, round shield, sword + shield.
  - **Handheld:** mug, bottle, wine glass, phone, book, umbrella, lantern, microphone, torch, briefcase, cane.
- **Màu cho mesh** (để phân biệt nhiều nhân vật, nhiều vật thể):
  - **Colour IDs** trên thanh công cụ: mỗi nhân vật và mỗi prop một màu riêng, thấy cả trong viewport lẫn ảnh Shaded. Bấm lần nữa để trả lại màu gốc.
  - Nhân vật: `•••` trong Outliner → *Paint it with its colour* / *Change colour…*.
  - Prop: `•••` → *Change colour…*, hoặc ô Colour trong bảng Props.
  - **Tô từng mặt** (Edit mode): chọn mặt, chọn màu rồi bấm *Paint selected faces*. *Clear paint* để xoá. Màu sơn được lưu theo scene.
  - Vũ khí có sẵn nhiều màu: lưỡi thép, chuôi da, chắn tay đồng, kiếm laser phát sáng…
- **Prop cầm tay:**
  - Mỗi món được dựng quanh điểm cầm. Khi *Put hand-held props in the character's hand* đang bật, món đó vào thẳng tay nhân vật: quiver lên lưng, cung vào tay trái, bộ đôi chia hai tay.
  - Prop đang cầm đi theo tay khi tạo dáng, IK hay chạy animation.
  - Muốn chỉnh cách cầm thì dời hoặc xoay prop bằng gizmo; độ lệch mới được giữ lại.
  - `•••` trong Outliner: *Hold in right / left hand*, *Wear on the back*, *Let go*.
- **Object:**
  - Move / rotate / scale (`G R S`), snap lưới, nhập số trực tiếp.
  - Duplicate (`Shift+D`), delete (`X`), join (`Ctrl+J`), copy/paste (`Ctrl+C/V`, dán được sang editor khác).
  - Mirror, drop to floor, apply rot/scale (`Ctrl+A`), origin → base, đổi màu, ẩn/hiện (`H`, `Alt+H`).
- **Boolean:** union, difference (khoét lỗ, cắt khối), intersect. Chọn các khối cắt trước, rồi Shift+click khối muốn giữ để nó làm active.
- **Edit mesh:**
  - Chọn vertex/edge/face (`1 2 3`), Shift+click thêm vào selection, box select (`B`), chọn hết (`A`).
  - Extrude (`E`), inset (`I`), bevel (`Ctrl+B`), subdivide, slice (loop cut theo trục), connect vertex (`J`), merge (`M`), fill (`F`), delete, separate (`P`), duplicate, flip normals.
- **Deform:**
  - Bend (bẻ cong), twist (xoắn), taper (vuốt thon). Áp lên cả object, hoặc chỉ lên các đỉnh đang chọn trong Edit mode.
  - Ở Object mode, bend tự cắt thêm segment để đường cong được mượt.
- **Lưu và đồng bộ:** prop đi vào depth, normal, canny và shaded. Mask có thể chỉ lấy nhân vật. Prop được lưu cùng pose JSON, tự lưu lại khi tải lại trang, và đồng bộ giữa tab với accordion. Undo/redo riêng cho modeling.

## Dùng
### Viewport kiểu Blender / Maya
Chọn trong *Viewport & shortcuts → Navigation*:
| Kiểu | Xoay | Pan | Zoom |
|---|---|---|---|
| Simple | LMB | RMB | Wheel |
| Blender | MMB (hoặc Alt+LMB) | Shift+MMB | Wheel |
| Maya | Alt+LMB | Alt+MMB | Alt+RMB / Wheel |

Click chuột trái lên chấm tròn để chọn khớp (xanh dương = trái, đỏ = phải, vàng = thân, tím = phần phụ).

**Camera chụp tách khỏi camera nhìn**, như camera object trong Blender. `Numpad 0` chuyển giữa nhìn qua camera và nhìn tự do. Ở chế độ tự do, camera chụp hiện thành một khung màu cam trong cảnh. `Ctrl+Alt+Numpad 0` (hoặc nút *Cam ← view*) đặt camera chụp vào góc đang nhìn. Capture luôn chụp từ camera chụp.

| Phím | Tác dụng |
|---|---|
| Numpad 1 / 3 / 7 (Ctrl: ngược lại) | Nhìn trước / phải / trên |
| Numpad 2 4 6 8, + / − | Xoay 15°, zoom |
| F hoặc Numpad . | Đóng khung vào khớp đang chọn |
| A hoặc Home | Đóng khung cả người |
| T | Gizmo xương: đổi move ↔ rotate |
| I · Q · K · C | IK · local/world · crop · capture |
| H (Pose mode) | Ẩn / hiện control |
| D / Insert (Object mode) | Chỉnh pivot |
| Ctrl+Z / Ctrl+Y | Undo / redo |

### Move / rotate / scale theo phím tắt
Bộ phím chọn riêng ở *Viewport → Transform keys*, không phụ thuộc kiểu điều hướng chuột. Áp dụng cho prop (Object), đỉnh/cạnh/mặt (Edit) và xương (Pose).

**Maya (mặc định):**
- `W` / `E` / `R`: manipulator move / rotate / scale.
- `G` và `S` vẫn dùng được như thao tác modal của Blender.
- Extrude là `Ctrl+E`.

**Blender:**
- `G` move, `R` rotate, `S` scale theo kiểu modal: vật bám theo chuột.
- Trong lúc thao tác:
  - `X` `Y` `Z` khoá trục (bấm lần hai là trục local), `Shift+X/Y/Z` dùng hai trục còn lại.
  - Gõ số để nhập giá trị chính xác (mét, độ, hệ số), giữ `Ctrl` để snap.
  - Click chuột trái hoặc `Enter` để chốt; `Esc` hoặc chuột phải để huỷ.
  - Bấm `G`/`R`/`S` để đổi sang thao tác khác mà không cần thoát.
- `Alt+G` / `Alt+R` / `Alt+S`: xoá vị trí / xoay / tỉ lệ.

**Move khớp ở Pose mode** (`W`, hoặc `G`), áp dụng cho **mọi khớp**:
- Bàn tay, bàn chân: chạy IK.
- Khuỷu, gối, cổ, đốt sống, ngón...: xương phía trên xoay theo để khớp đi tới chỗ kéo, độ dài xương giữ nguyên, vẫn trong giới hạn khớp.
- Gốc đùi, đốt sống đầu tiên: dời hông, chân vẫn ghim nếu bật *Pin feet*.

### Pivot / origin (Object và Edit mode)
- **Pivot** (bảng Props), tâm để xoay và scale, giống *Transform Pivot Point* của Blender:
  - *Median point*: tâm các vật / đỉnh đang chọn.
  - *Active element*: origin của vật active.
  - *Individual origins*: mỗi vật xoay/scale quanh origin riêng.
  - *World origin*: gốc toạ độ (0, 0, 0).
- **Edit pivot** (`D` hoặc `Insert`, giống Maya): gizmo chỉ di chuyển và xoay pivot của vật, hình không nhúc nhích. Bấm `D` hoặc `Esc` để xong. Từ đó xoay/scale đều quanh pivot mới, ví dụ bản lề cửa hay chân ghế.
- **Snap pivot to** (khi đang Edit pivot):
  - *Vertex*, *Edge centre*, *Face centre*, *Object origin*: khi kéo gizmo, pivot nhảy tới điểm gần nhất trên màn hình. Click lên một mặt thì pivot đặt vào đỉnh, trung điểm cạnh hoặc tâm của mặt đó (kể cả mặt của vật khác).
  - *Grid*: làm tròn theo lưới 5 cm.
  - *Off*: click đặt pivot đúng điểm trên bề mặt.
- **Reset pivot:** đưa pivot (vị trí và hướng trục) về đúng như lúc vật được tạo, hình không nhúc nhích.
- **Đặt origin nhanh:**
  - *Origin → base*: đáy giữa.
  - *→ center*: tâm hình.
  - *→ world*: gốc toạ độ.
  - *→ selected*: các đỉnh đang chọn ở Edit mode.

### Nhiều view (kiểu Maya)
- Nút **1 / 2 / 4** trên thanh công cụ chọn bố cục: một view, hai view cạnh nhau, hoặc bốn view.
- Mỗi ô có menu ở góc dưới trái: *Camera* (camera chụp), *Perspective* (camera tự do), *Front*, *Back*, *Left side*, *Right side*, *Top*, *Bottom* (trực giao).
- Ô dưới chuột là **ô đang hoạt động** (viền màu nhấn): click chọn, gizmo, phím tắt và điều hướng đều áp dụng cho ô đó.
- **`Space`**: phóng to ô dưới chuột thành một view, bấm lần nữa để quay lại bố cục cũ.
- **View trực giao:** kéo chuột giữa hoặc phải (hoặc giữ `Alt`) để pan, cuộn để zoom vào chỗ con trỏ. `F` / `A` đóng khung. Numpad 1 / 3 / 7 (Ctrl: phía ngược lại) đổi ô đó sang Front / Side / Top.
- `Numpad 0` đổi ô đang hoạt động giữa Camera và Perspective.
- Ô Camera giữ đúng tỉ lệ ảnh xuất, có overlay OpenPose, lưới ⅓ và crop như bình thường.
- Bố cục và nội dung từng ô được nhớ lại.

### Đóng khung cảnh (Shot composer)
Chọn **cỡ cảnh** (extreme close-up, close-up, portrait, medium, cowboy, full body, wide) × **góc máy** (eye level, high, low, bird's eye, worm's eye, overhead) × **hướng** (8 hướng quanh nhân vật) × **ống kính** (14–200 mm, quy đổi full-frame) × **dutch** (±10/20/30°) × **bố cục** (giữa, ⅓ trái, ⅓ phải).
Camera được tính chính xác từ keypoint của dáng hiện tại, nên ngồi, quỳ hay giơ tay đều cắt đúng chỗ: cowboy cắt giữa đùi, portrait cắt ngang ngực...

**Crop tự do:** bấm `K` rồi kéo một khung trên ảnh. Crop ăn theo đúng tỉ lệ W×H và là lens shift thật, nên phối cảnh giữ nguyên như khi crop ảnh chụp. Crop được nhiều lần chồng lên nhau; *Reset crop* để bỏ. Có lưới ⅓ để căn bố cục. View đã lưu và đồng bộ đều giữ cả crop.

**Shot tags:** tự sinh tag cho góc máy (`from above, three-quarter view, cowboy shot`...), kiểu Danbooru hoặc văn xuôi. Bấm *Add to prompt*, hoặc tick *Append camera shot tags* trong accordion để tự nối vào prompt lúc Generate (ghi vào infotext là `Marionette shot`).

**Gửi sang ControlNet:** mỗi pass chọn một unit. *Send* sẽ thả ảnh vào unit đó và bật unit lên. Tick *Capture + send automatically on Generate* để mỗi lần bấm Generate là chụp lại từ góc camera hiện tại rồi mới chạy.
Đặt preprocessor của unit thành **None**, vì ảnh đã là control map sẵn.

## Hiệu năng
- Các editor (tab Marionette và 2 accordion) chạy chung một luồng với trang WebUI. Chúng chỉ đồng bộ khi thực sự có thay đổi, chỉ gửi phần đã đổi, và editor đang ẩn (accordion đóng, tab khác) sẽ đợi tới khi hiện ra mới cập nhật và vẽ.
- **Viewport quality** (bảng Viewport): *Balanced* là mặc định. Màn hình 4K hoặc GPU yếu thì chọn *Fast* hoặc *Fastest*. Ảnh capture luôn xuất ở đủ chất lượng.
- **Show FPS / timing**: hiện số lần vẽ mỗi giây, thời gian mỗi lần vẽ và số lần đồng bộ vào/ra mỗi giây. Khi đứng yên, cả ba phải bằng 0.
- Editor không đọc layout của trang trong lúc kéo chuột (kích thước canvas được nhớ sẵn), vì mỗi lần đọc buộc cả trang WebUI tính lại layout. Việc theo dõi editor có đang hiện hay không dùng IntersectionObserver, không hỏi liên tục.
- *Shadows* trong bảng Lighting tốn GPU: tắt đi nếu máy yếu.

## Lưu ý
- Normal: mặc định red = trái (kiểu NormalBae). Nếu ra sai chiều thì đổi 2 checkbox flip.
- Model không có xương ngón tay: OpenPose tay tự tắt.
- `.gltf` có texture rời không mở được qua *Open file*. Hãy dùng `.glb`, hoặc bỏ vào thư mục models.
- Pose lưu ở dạng delta xoay world-space theo tên xương chuẩn, nên đổi qua lại giữa các model khác rig vẫn giữ được dáng.
