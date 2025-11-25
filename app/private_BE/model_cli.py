#!/usr/bin/env python3
"""
Model CLI
서버 실행 중 CLI를 통해 모델을 동적으로 변경할 수 있는 도구
"""
import argparse
import asyncio
import sys
from typing import Optional

import httpx
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

console = Console()


class ModelCLI:
    """모델 관리 CLI"""

    def __init__(self, server_url: str = "http://localhost:8000", api_prefix: str = "/api/v1"):
        self.server_url = server_url.rstrip("/")
        self.api_prefix = api_prefix.rstrip("/")
        self.base_url = f"{self.server_url}{self.api_prefix}"

    async def get_model_info(self):
        """현재 모델 정보 조회"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_url}/model/info")
                response.raise_for_status()
                data = response.json()

                # 테이블 생성
                table = Table(title="현재 로드된 모델 정보")
                table.add_column("항목", style="cyan", no_wrap=True)
                table.add_column("값", style="magenta")

                table.add_row("Pose Model", data.get("pose_model", "N/A"))
                table.add_row("VLM Model", data.get("vlm_model", "N/A") or "None (Side only)")
                table.add_row("Device", data.get("device", "N/A"))
                table.add_row("Available Models", ", ".join(data.get("available_models", [])))

                console.print(table)
                return data

        except httpx.HTTPStatusError as e:
            console.print(f"[red]Error: HTTP {e.response.status_code}[/red]")
            console.print(f"[red]{e.response.text}[/red]")
            return None
        except Exception as e:
            console.print(f"[red]Failed to connect to server: {e}[/red]")
            return None

    async def get_stats(self):
        """프로세스 통계 조회"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_url}/model/stats")
                response.raise_for_status()
                data = response.json()

                # 테이블 생성
                table = Table(title="프로세스 상태")
                table.add_column("Process", style="cyan", no_wrap=True)
                table.add_column("Queue Size", style="yellow")
                table.add_column("Result Queue Size", style="green")

                for process_name, stats in data.items():
                    table.add_row(
                        process_name.upper(),
                        str(stats.get("queue_size", 0)),
                        str(stats.get("result_queue_size", 0))
                    )

                console.print(table)
                return data

        except httpx.HTTPStatusError as e:
            console.print(f"[red]Error: HTTP {e.response.status_code}[/red]")
            return None
        except Exception as e:
            console.print(f"[red]Failed to connect to server: {e}[/red]")
            return None

    async def reload_model(self, model_type: str, config_path: Optional[str] = None):
        """모델 재로드"""
        try:
            console.print(f"[yellow]Reloading {model_type} model...[/yellow]")

            async with httpx.AsyncClient(timeout=30.0) as client:
                url = f"{self.base_url}/model/reload/{model_type}"
                response = await client.post(url)
                response.raise_for_status()
                data = response.json()

                if data.get("status") == "success":
                    console.print(Panel(
                        f"✅ {data.get('message', 'Success')}",
                        title="Model Reload Success",
                        border_style="green"
                    ))
                    if "model" in data:
                        console.print(f"[green]Current model: {data['model']}[/green]")
                else:
                    console.print(Panel(
                        f"⚠️  {data.get('message', 'Unknown status')}",
                        title="Model Reload Warning",
                        border_style="yellow"
                    ))

                return data

        except httpx.HTTPStatusError as e:
            console.print(Panel(
                f"❌ HTTP {e.response.status_code}\n{e.response.text}",
                title="Model Reload Failed",
                border_style="red"
            ))
            return None
        except Exception as e:
            console.print(Panel(
                f"❌ {str(e)}",
                title="Connection Error",
                border_style="red"
            ))
            return None

    async def interactive_mode(self):
        """대화형 모드"""
        console.print(Panel.fit(
            "Model Management CLI - Interactive Mode\n"
            "Commands: info, stats, reload [side|air|all], quit",
            border_style="cyan"
        ))

        while True:
            try:
                command = console.input("\n[cyan]model-cli>[/cyan] ").strip().lower()

                if command == "quit" or command == "exit":
                    console.print("[yellow]Goodbye![/yellow]")
                    break

                elif command == "info":
                    await self.get_model_info()

                elif command == "stats":
                    await self.get_stats()

                elif command.startswith("reload"):
                    parts = command.split()
                    if len(parts) < 2:
                        console.print("[red]Usage: reload [side|air|all][/red]")
                    else:
                        model_type = parts[1]
                        if model_type in ["side", "air", "all"]:
                            await self.reload_model(model_type)
                        else:
                            console.print(f"[red]Invalid model type: {model_type}[/red]")

                elif command == "help":
                    console.print("""
[cyan]Available commands:[/cyan]
  info              - Show current model information
  stats             - Show process statistics
  reload [type]     - Reload model (type: side, air, or all)
  quit/exit         - Exit interactive mode
  help              - Show this help message
                    """)

                elif command:
                    console.print(f"[red]Unknown command: {command}[/red]")
                    console.print("[yellow]Type 'help' for available commands[/yellow]")

            except KeyboardInterrupt:
                console.print("\n[yellow]Use 'quit' to exit[/yellow]")
            except EOFError:
                break


async def main():
    parser = argparse.ArgumentParser(
        description="SomniAI Model Management CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Show current model info
  python model_cli.py info

  # Reload side model
  python model_cli.py reload side

  # Interactive mode
  python model_cli.py interactive
        """
    )

    parser.add_argument(
        "command",
        nargs="?",
        choices=["info", "stats", "reload", "interactive"],
        default="interactive",
        help="Command to execute"
    )

    parser.add_argument(
        "model_type",
        nargs="?",
        choices=["side", "air", "all"],
        help="Model type to reload (for 'reload' command)"
    )

    parser.add_argument(
        "--server",
        default="http://localhost:8000",
        help="Server URL (default: http://localhost:8000)"
    )

    parser.add_argument(
        "--api-prefix",
        default="/api/v1",
        help="API prefix (default: /api/v1)"
    )

    args = parser.parse_args()

    cli = ModelCLI(server_url=args.server, api_prefix=args.api_prefix)

    if args.command == "info":
        await cli.get_model_info()

    elif args.command == "stats":
        await cli.get_stats()

    elif args.command == "reload":
        if not args.model_type:
            console.print("[red]Error: model_type is required for reload command[/red]")
            console.print("[yellow]Usage: python model_cli.py reload [side|air|all][/yellow]")
            sys.exit(1)
        await cli.reload_model(args.model_type)

    elif args.command == "interactive":
        await cli.interactive_mode()


if __name__ == "__main__":
    asyncio.run(main())
