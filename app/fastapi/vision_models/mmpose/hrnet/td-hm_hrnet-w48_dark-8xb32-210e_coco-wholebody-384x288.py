_base_ = ['../_base_/default_runtime.py']

# runtime
train_cfg = dict(max_epochs=210, val_interval=10)

# optimizer
optim_wrapper = dict(optimizer=dict(
    type='Adam',
    lr=5e-4,
))

# learning policy
param_scheduler = [
    dict(
        type='LinearLR', begin=0, end=500, start_factor=0.001,
        by_epoch=False),  # warm-up
    dict(
        type='MultiStepLR',
        begin=0,
        end=210,
        milestones=[170, 200],
        gamma=0.1,
        by_epoch=True)
]

# automatically scaling LR based on the actual training batch size
auto_scale_lr = dict(base_batch_size=512)

# hooks
default_hooks = dict(
    checkpoint=dict(save_best='coco-wholebody/AP', rule='greater'))

# codec settings
codec = dict(
    type='MSRAHeatmap', input_size=(288, 384), heatmap_size=(72, 96), sigma=3)

# model settings
model = dict(
    type='TopdownPoseEstimator',
    data_preprocessor=dict(
        type='PoseDataPreprocessor',
        mean=[123.675, 116.28, 103.53],
        std=[58.395, 57.12, 57.375],
        bgr_to_rgb=True),
    backbone=dict(
        type='HRNet',
        in_channels=3,
        extra=dict(
            stage1=dict(
                num_modules=1,
                num_branches=1,
                block='BOTTLENECK',
                num_blocks=(4, ),
                num_channels=(64, )),
            stage2=dict(
                num_modules=1,
                num_branches=2,
                block='BASIC',
                num_blocks=(4, 4),
                num_channels=(48, 96)),
            stage3=dict(
                num_modules=4,
                num_branches=3,
                block='BASIC',
                num_blocks=(4, 4, 4),
                num_channels=(48, 96, 192)),
            stage4=dict(
                num_modules=3,
                num_branches=4,
                block='BASIC',
                num_blocks=(4, 4, 4, 4),
                num_channels=(48, 96, 192, 384))),
        init_cfg=dict(
            type='Pretrained',
            checkpoint='https://download.openmmlab.com/mmpose/'
            'pretrain_models/hrnet_w48-8ef0771d.pth'),
    ),
    head=dict(
        type='HeatmapHead',
        in_channels=48,
        out_channels=133,
        deconv_out_channels=None,
        loss=dict(type='KeypointMSELoss', use_target_weight=True),
        decoder=codec),
    test_cfg=dict(
        flip_test=True,
        flip_mode='heatmap',
        shift_heatmap=True,
    ))

# base dataset settings
dataset_type = 'CocoWholeBodyDataset'
data_mode = 'topdown'
data_root = 'data/coco/'

# ------------------------------------------------
# Dataset Meta for COCO-WholeBody 133 Keypoints
# ------------------------------------------------
dataset_meta = dict(
    keypoint_id2name={
        0: 'nose', 1: 'left_eye', 2: 'right_eye', 3: 'left_ear', 4: 'right_ear',
        5: 'left_shoulder', 6: 'right_shoulder', 7: 'left_elbow', 8: 'right_elbow',
        9: 'left_wrist', 10: 'right_wrist', 11: 'left_hip', 12: 'right_hip',
        13: 'left_knee', 14: 'right_knee', 15: 'left_ankle', 16: 'right_ankle',
        # body (17)
        17: 'left_big_toe', 18: 'left_small_toe', 19: 'left_heel',
        20: 'right_big_toe', 21: 'right_small_toe', 22: 'right_heel',
        # foot (6)
        23: 'left_thumb', 24: 'left_index', 25: 'left_middle',
        26: 'left_ring', 27: 'left_pinky',
        28: 'right_thumb', 29: 'right_index', 30: 'right_middle',
        31: 'right_ring', 32: 'right_pinky',
        # hand (10+10=20)
        33: 'head_top',
        # face (68 keypoints, index 34~101)
        **{i: f'face_{i-33}' for i in range(34, 102)},
        # left hand (21 keypoints, index 102~122)
        **{i: f'left_hand_{i-101}' for i in range(102, 123)},
        # right hand (21 keypoints, index 123~143)
        **{i: f'right_hand_{i-122}' for i in range(123, 144)},
    },
    skeleton=[
        # body skeleton (COCO 기본 17개 + 발목/발가락)
        [16, 14], [14, 12], [17, 15], [15, 13], [12, 13],
        [6, 12], [7, 13], [6, 7], [6, 8], [7, 9],
        [8, 10], [9, 11], [2, 3], [1, 2], [1, 3],
        [2, 4], [3, 5], [4, 6], [5, 7],
        # 발 확장
        [15, 19], [19, 17], [15, 17],
        [16, 22], [22, 20], [16, 20],
        # face (예시: 눈, 코, 입 주요 연결만 / 세부 68점은 보통 생략 가능)
        [0, 33], [1, 3], [2, 4],
        # hands & fingers는 각자 21점 skeleton (엄지~소지, 손목 연결)
        # config 파일에 이미 정의돼 있다면 그대로 복붙 가능
    ],
    flip_pairs=[
        # face
        [1, 2], [3, 4],
        # shoulders, elbows, wrists
        [5, 6], [7, 8], [9, 10],
        # hips, knees, ankles
        [11, 12], [13, 14], [15, 16],
        # toes
        [17, 20], [18, 21], [19, 22],
        # hands
        [23, 28], [24, 29], [25, 30], [26, 31], [27, 32],
        # left hand 21 ↔ right hand 21
        *[(i, i+21) for i in range(102, 123)],
        # face symmetry (예: 왼쪽 눈 ↔ 오른쪽 눈, 왼쪽 입꼬리 ↔ 오른쪽 입꼬리 등)
    ],
    upper_body_ids=tuple(range(0, 92)),  # 얼굴 + 상체
    lower_body_ids=tuple(range(92, 133)), # 하체 + 발
    dataset_name='coco_wholebody'
)


# pipelines
train_pipeline = [
    dict(type='LoadImage'),
    dict(type='GetBBoxCenterScale'),
    dict(type='RandomFlip', direction='horizontal'),
    dict(type='RandomHalfBody'),
    dict(type='RandomBBoxTransform'),
    dict(type='TopdownAffine', input_size=codec['input_size']),
    dict(type='GenerateTarget', encoder=codec),
    dict(type='PackPoseInputs')
]
val_pipeline = [
    dict(type='LoadImage'),
    dict(type='GetBBoxCenterScale'),
    dict(type='TopdownAffine', input_size=codec['input_size']),
    dict(type='PackPoseInputs')
]

# data loaders
train_dataloader = dict(
    batch_size=32,
    num_workers=2,
    persistent_workers=True,
    sampler=dict(type='DefaultSampler', shuffle=True),
    dataset=dict(
        type=dataset_type,
        data_root=data_root,
        data_mode=data_mode,
        ann_file='annotations/coco_wholebody_train_v1.0.json',
        data_prefix=dict(img='train2017/'),
        pipeline=train_pipeline,
    ))
val_dataloader = dict(
    batch_size=32,
    num_workers=2,
    persistent_workers=True,
    drop_last=False,
    sampler=dict(type='DefaultSampler', shuffle=False, round_up=False),
    dataset=dict(
        type=dataset_type,
        data_root=data_root,
        data_mode=data_mode,
        ann_file='annotations/coco_wholebody_val_v1.0.json',
        data_prefix=dict(img='val2017/'),
        test_mode=True,
        bbox_file='data/coco/person_detection_results/'
        'COCO_val2017_detections_AP_H_56_person.json',
        pipeline=val_pipeline,
    ))
test_dataloader = val_dataloader

val_evaluator = dict(
    type='CocoWholeBodyMetric',
    ann_file=data_root + 'annotations/coco_wholebody_val_v1.0.json')
test_evaluator = val_evaluator