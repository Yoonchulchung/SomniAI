dataset_info = dict(
    dataset_name='vipcup2021_sleeppose',
    
    keypoint_info={
        0: dict(name='head',         id=0, color=[255,   0,  0], type='upper', swap=''),
        1: dict(name='neck',         id=1, color=[255,  85,  0], type='upper', swap=''),
        2: dict(name='r_shoulder',   id=2, color=[255, 170,  0], type='upper', swap='l_shoulder'),
        3: dict(name='r_elbow',      id=3, color=[255, 255,  0], type='upper', swap='l_elbow'),
        4: dict(name='r_wrist',      id=4, color=[170, 255,  0], type='upper', swap='l_wrist'),
        5: dict(name='l_shoulder',   id=5, color=[ 85, 255,  0], type='upper', swap='r_shoulder'),
        6: dict(name='l_elbow',      id=6, color=[  0, 255,  0], type='upper', swap='r_elbow'),
        7: dict(name='l_wrist',      id=7, color=[  0, 255, 85], type='upper', swap='r_wrist'),
        8: dict(name='r_hip',        id=8, color=[  0, 255,170], type='lower', swap='l_hip'),
        9: dict(name='r_knee',       id=9, color=[  0, 255,255], type='lower', swap='l_knee'),
       10: dict(name='r_ankle',      id=10, color=[  0, 170,255], type='lower', swap='l_ankle'),
       11: dict(name='l_hip',        id=11, color=[  0,  85,255], type='lower', swap='r_hip'),
       12: dict(name='l_knee',       id=12, color=[  0,   0,255], type='lower', swap='r_knee'),
       13: dict(name='l_ankle',      id=13, color=[ 85,   0,255], type='lower', swap='r_ankle')
    },

    skeleton_info={
         0: dict(link=('l_ankle',   'l_knee'),     id=0, color=[  0,255,  0]),
         1: dict(link=('l_knee',    'l_hip'),      id=1, color=[  0,255,  0]),
         2: dict(link=('r_ankle',   'r_knee'),     id=2, color=[255,128,  0]),
         3: dict(link=('r_knee',    'r_hip'),      id=3, color=[255,128,  0]),
         4: dict(link=('l_hip',     'r_hip'),      id=4, color=[ 51,153,255]),
         5: dict(link=('neck',      'l_hip'),      id=5, color=[ 51,153,255]),
         6: dict(link=('neck',      'r_hip'),      id=6, color=[ 51,153,255]),
         7: dict(link=('l_shoulder','r_shoulder'), id=7, color=[ 51,153,255]),
         8: dict(link=('l_shoulder','neck'),       id=8, color=[ 51,153,255]),
         9: dict(link=('r_shoulder','neck'),       id=9, color=[ 51,153,255]),
        10: dict(link=('l_shoulder','l_elbow'),    id=10,color=[  0,255,  0]),
        11: dict(link=('r_shoulder','r_elbow'),    id=11,color=[255,128,  0]),
        12: dict(link=('l_elbow',   'l_wrist'),    id=12,color=[  0,255,  0]),
        13: dict(link=('r_elbow',   'r_wrist'),    id=13,color=[255,128,  0]),
        14: dict(link=('head',      'neck'),       id=14,color=[ 51,153,255])
    },

    joint_weights=[
        1.5,  # head
        1.0,  # neck
        1.0, 1.2, 1.2,    # R shoulder/elbow/wrist
        1.0, 1.2, 1.2,    # L shoulder/elbow/wrist
        1.0, 1.2, 1.2,    # R hip/knee/ankle
        1.0, 1.2, 1.2     # L hip/knee/ankle
    ],

    sigmas=[
        0.026,  # head
        0.025,  # neck
        0.079, 0.072, 0.062,   # R shoulder/elbow/wrist
        0.079, 0.072, 0.062,   # L shoulder/elbow/wrist
        0.107, 0.087, 0.089,   # R hip/knee/ankle
        0.107, 0.087, 0.089    # L hip/knee/ankle
    ]
)