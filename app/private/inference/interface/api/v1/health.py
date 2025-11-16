from fastapi import APIRouter, Depends, Request
from dependency_injector.wiring import inject, Provide

from inference.containers import InferenceContainer
from inference.application.health_check import Rsponse_Health_Check

router = APIRouter()


@router.api_route("/health", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
@inject
async def health(
    request: Request,
    parser: Rsponse_Health_Check = Depends(Provide[InferenceContainer.health_check])
):
    return await parser.parse_client(request)