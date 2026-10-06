:- initialization(main).

main :-
    read_term(user_input, Name, []),
    format("Hello, ~w!~n", [Name]),
    halt.
