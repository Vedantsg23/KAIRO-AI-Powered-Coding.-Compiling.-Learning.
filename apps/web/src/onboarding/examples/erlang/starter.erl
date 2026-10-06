%% Welcome to Erlang! Press Run (Ctrl+Enter) to compile and run this program.
%% The module must be called main and export main/0.
-module(main).
-export([main/0]).

main() ->
    Marks = [72, 88, 95, 64, 81],
    Total = lists:sum(Marks),
    io:format("Total: ~p~n", [Total]),
    io:format("Average: ~.1f~n", [Total / length(Marks)]).
