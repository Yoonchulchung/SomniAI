from fastapi import APIRouter, Depends, Request

from inference.application.health_check import Rsponse_Health_Check


def get_healtcheck():
    return Rsponse_Health_Check()

router = APIRouter()

@router.api_route("/health", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def health(request: Request, parser=Depends(get_healtcheck)):
    return await parser.parse_client(request)