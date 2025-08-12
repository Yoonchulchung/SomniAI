from dataclasses import dataclass


@dataclass
class ServiceConfig:
    application_contentType = ['application/octet-stream', 'application/json']
    multipart_contentType = ['multipart/form-data']

    contentType = ['application/octet-stream', 'application/json', 'multipart/form-data']

