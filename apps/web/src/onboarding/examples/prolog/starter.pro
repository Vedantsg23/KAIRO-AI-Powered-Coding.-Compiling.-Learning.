% Welcome to Prolog! Press Run (Ctrl+Enter) to load and run this program.
% initialization(main) runs main/0 once the file is loaded.
:- initialization(main).

parent(tom, bob).
parent(bob, ann).
parent(bob, pat).

grandparent(X, Z) :- parent(X, Y), parent(Y, Z).

main :-
    forall(grandparent(tom, G), format("tom is a grandparent of ~w~n", [G])),
    sum_list([72, 88, 95, 64, 81], Total),
    format("Total: ~w~n", [Total]),
    halt.
