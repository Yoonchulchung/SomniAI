_base_ = [
    '../_base_/default_runtime.py',
    '../_base_/datasets/ieee_vip_cup_2021.py', 
]

data_root = '/home/yoonchul/Documents/personal_work/SomniAI/data'     
train_cfg = dict(max_epochs=210, val_interval=10)

data_img_size = (1024, 576)  # (height, width)

optim_wrapper = dict(optimizer=dict(
    type='Adam',
    lr=1e-3,
))

param_scheduler = [
    dict(
        type='MultiStepLR',
        begin=0,
        end=140,
        milestones=[90, 120],
        gamma=0.1,
        by_epoch=True)
]

auto_scale_lr = dict(base_batch_size=160)

# hooks
default_hooks = dict(checkpoint=dict(save_best='coco/AP', rule='greater'))

# codec settings
codec = dict(
    type='UDPHeatmap', input_size=data_img_size, heatmap_size=(144, 256))

lr_config = dict(
    policy='step',
    warmup='linear',
    warmup_iters=500,
    warmup_ratio=0.001,
    step=[170, 200])
total_epochs = 210

channel_cfg = dict(
    num_output_channels=14,       
    dataset_joints=14,             
    dataset_channel=[list(range(14))],
    inference_channel=list(range(14)))

# =========================================================================
#               Model settings
# =========================================================================
model = dict(
    type='TopdownPoseEstimator',
    backbone=dict(
        type='ViT',
        img_size=data_img_size,       
        patch_size=16,
        embed_dim=768,
        depth=12,
        num_heads=12,
        ratio=1,
        mlp_ratio=4,
        qkv_bias=True,
        drop_path_rate=0.3),
    # head=dict(
    #     type='HeatmapHead',
    #     in_channels=768,
    #     out_channels=channel_cfg['num_output_channels'],
    #     deconv_out_channels=(256, 256),
    #     deconv_kernel_sizes=(4, 4),
    #     loss=dict(type='KeypointMSELoss', use_target_weight=True),
    #     decoder=codec),
    head=dict(
        type='TopdownHeatmapSimpleHead',
        in_channels=768,
        num_deconv_layers=2,
        num_deconv_filters=(256, 256),
        num_deconv_kernels=(4, 4),
        extra=dict(final_conv_kernel=1, ),
        out_channels=channel_cfg['num_output_channels'],
        loss_keypoint=dict(type='JointsMSELoss', use_target_weight=False)),
    test_cfg=dict(
        flip_test=True,
        post_process='default',
        shift_heatmap=False,
        target_type='GaussianHeatmap',
        modulate_kernel=11,
        use_udp=True))

# =========================================================================
#               Dataset settings
# =========================================================================
data_cfg = dict(
    image_size=data_img_size,
    heatmap_size=[48, 64],
    num_output_channels=channel_cfg['num_output_channels'],
    num_joints=channel_cfg['dataset_joints'],
    dataset_channel=channel_cfg['dataset_channel'],
    inference_channel=channel_cfg['inference_channel'],
    soft_nms=False,
    oks_thr=0.9,
    vis_thr=0.2,
    use_gt_bbox=True,          # VIP Cup은 GT bbox가 없는 대신 라벨에서 추출
    det_bbox_thr=0.0)

# =========================================================================
#               Data pipeline settings
# =========================================================================

train_pipeline = [
    dict(type='LoadImage', to_float32=True),
    dict(type='TopdownAffine', input_size=codec['input_size']),
    dict(type='RandomFlip', direction='horizontal'),
    dict(type='GenerateTarget', encoder=codec),
    dict(type='PackPoseInputs'),
]
val_pipeline = [
    dict(type='LoadImage'),
    dict(
        type='PackPoseInputs',
        meta_keys=('id', 'img_id', 'img_path', 'crowd_index', 'ori_shape',
                   'img_shape', 'input_size', 'input_center', 'input_scale',
                   'flip', 'flip_direction', 'flip_indices', 'raw_ann_info',
                   'skeleton_links'))
]
test_pipeline = val_pipeline

data_mode = 'topdown' # IEEE VIP Cup 2021 dataset is in topdown mode
dataset_type = 'IEEEVIPCup2021Dataset'


train_dataloader = dict(
    batch_size=2,
    num_workers=2,
    persistent_workers=True,
    sampler=dict(type='DefaultSampler', shuffle=True),
    dataset=dict(
        type=dataset_type,
        data_root=data_root,
        data_mode=data_mode,
        ann_file=f'{data_root}/converted-ieee-vip-cup-2021/vipcup2021_coco_train.json',
        data_prefix=dict(img=data_root),
        pipeline=train_pipeline,
    ))
val_dataloader = dict(
    batch_size=1,
    num_workers=1,
    persistent_workers=True,
    drop_last=False,
    sampler=dict(type='DefaultSampler', shuffle=False, round_up=False),
    dataset=dict(
        type=dataset_type,
        data_root=data_root,
        data_mode=data_mode,
        ann_file=f'{data_root}/converted-ieee-vip-cup-2021/vipcup2021_coco_val.json',
        data_prefix=dict(img=data_root),
        test_mode=True,
        pipeline=val_pipeline,
    ))
test_dataloader = val_dataloader

val_evaluator = dict(
    type='IEEEVIP2021Metric',
    ann_file=f'{data_root}/converted-ieee-vip-cup-2021/vipcup2021_coco_val.json',
    nms_thr=0.8,
    score_mode='keypoint',
)
test_evaluator = val_evaluator
work_dir = './work_dirs/vipcup21/vitb16_256x192'
