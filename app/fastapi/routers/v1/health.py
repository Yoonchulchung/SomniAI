from fastapi import APIRouter, Depends, Request

from SomniAI.router import health_check


def get_healtcheck():
    return health_check()

router = APIRouter()

@router.api_route("/health", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def health(request: Request, parser=Depends(get_healtcheck)):
    return await parser.parse_client(request)