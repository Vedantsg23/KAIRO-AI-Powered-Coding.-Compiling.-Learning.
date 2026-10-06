(use-modules (ice-9 rdelim))
(define name (read-line))
(display (string-append "Hello, " name "!"))
(newline)
