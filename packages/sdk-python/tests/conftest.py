"""Run coroutine tests without requiring a pytest async plugin."""
import asyncio
import inspect


def pytest_pyfunc_call(pyfuncitem):
    if inspect.iscoroutinefunction(pyfuncitem.obj):
        kwargs = {name: pyfuncitem.funcargs[name] for name in inspect.signature(pyfuncitem.obj).parameters}
        asyncio.run(pyfuncitem.obj(**kwargs))
        return True
    return None
