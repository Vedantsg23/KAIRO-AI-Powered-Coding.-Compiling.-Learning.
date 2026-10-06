;; Welcome to Scheme (GNU Guile)! Press Run (Ctrl+Enter) to run this program.
(define marks '(72 88 95 64 81))

(define (sum lst)
  (if (null? lst)
      0
      (+ (car lst) (sum (cdr lst)))))

(display "Total: ")
(display (sum marks))
(newline)
(display "Average: ")
(display (exact->inexact (/ (sum marks) (length marks))))
(newline)
