from __future__ import annotations

from collections import OrderedDict

from ..domain.execution import Execution


class InMemoryExecutionStore:
    """Bounded in-memory store (oldest finished executions are evicted first).

    Deliberately simple for now: one API process, data lost on restart.
    The database milestone (Supabase) replaces it with a repository with the same methods.
    """

    def __init__(self, max_items: int) -> None:
        self._items: OrderedDict[str, Execution] = OrderedDict()
        self._max = max_items

    def add(self, execution: Execution) -> None:
        self._items[execution.id] = execution
        self._evict()

    def get(self, execution_id: str) -> Execution | None:
        return self._items.get(execution_id)

    def __len__(self) -> int:
        return len(self._items)

    def _evict(self) -> None:
        if len(self._items) <= self._max:
            return
        for key in [k for k, e in self._items.items() if e.terminal]:
            if len(self._items) <= self._max:
                break
            del self._items[key]
