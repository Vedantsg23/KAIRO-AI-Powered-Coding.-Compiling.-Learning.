-module(main).
-export([main/0]).

main() ->
    B = list_to_integer(string:trim(io:get_line(""))),
    io:format("~p~n", [10 div B]).
