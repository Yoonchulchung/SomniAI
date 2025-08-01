# Copyright (c) OpenMMLab. All rights reserved.

from .heatmap_loss import (AdaptiveWingLoss, KeypointMSELoss,
                           KeypointOHKMMSELoss, MLECCLoss)
from .mse_loss import JointsMSELoss, JointsOHKMMSELoss

__all__ = [
    'KeypointMSELoss', 'KeypointOHKMMSELoss', 'AdaptiveWingLoss', 'MLECCLoss',
    'JointsMSELoss', 'JointsOHKMMSELoss'
]
