from dataclasses import dataclass


@dataclass
class User:
    id : str
    name : str
    password : str
    db_status : bool
    created_at : str
    updated_at : str    
    