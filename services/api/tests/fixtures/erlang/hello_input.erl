-module(main).
-export([main/0]).

main() ->
    Name = string:trim(io:get_line("")),
    io:format("Hello, ~s!~n", [Name]).
