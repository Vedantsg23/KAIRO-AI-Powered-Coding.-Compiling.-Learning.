:- initialization(main).

main :-
    X is 10 / 0,
    write(X), nl,
    halt.
