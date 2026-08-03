"""WorkspaceKit Theme Lab - ComfyUI extension and constrained theme storage API."""

import json
import logging

try:
    from .theme_storage import MAX_REQUEST_BYTES, ThemeStorage, ThemeStorageError
except ImportError:  # Standalone import used by tests; ComfyUI uses the package import above.
    from theme_storage import MAX_REQUEST_BYTES, ThemeStorage, ThemeStorageError

NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}
WEB_DIRECTORY = "./js"


def _register_routes() -> None:
    """Register only when imported by ComfyUI, not during standalone smoke tests."""
    try:
        from aiohttp import web
        from server import PromptServer
    except ImportError:
        return

    storage = ThemeStorage()
    routes = PromptServer.instance.routes

    @routes.post("/workspacekit-theme/save")
    async def save_theme(request):
        if request.content_length is not None and request.content_length > MAX_REQUEST_BYTES:
            return web.json_response({"error": "Theme request exceeds the 1 MB limit."}, status=413)
        try:
            raw_body = await request.read()
            if len(raw_body) > MAX_REQUEST_BYTES:
                raise ThemeStorageError("Theme request exceeds the 1 MB limit.", 413)
            payload = json.loads(raw_body.decode("utf-8"))
            result = storage.save(payload)
            return web.json_response(result, status=201 if result["created"] else 200)
        except UnicodeDecodeError:
            return web.json_response({"error": "Theme request must use UTF-8 JSON."}, status=400)
        except json.JSONDecodeError:
            return web.json_response({"error": "Theme request must contain valid JSON."}, status=400)
        except ThemeStorageError as error:
            return web.json_response({"error": error.message}, status=error.status)
        except Exception:
            logging.getLogger(__name__).exception("WorkspaceKit Theme save failed")
            return web.json_response({"error": "Theme save failed safely."}, status=500)


_register_routes()

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
