;;; Welcome to Common Lisp (SBCL)! Press Run (Ctrl+Enter) to run this program.
(defparameter *marks* '(72 88 95 64 81))

(defun total (marks)
  (reduce #'+ marks))

(format t "Total: ~a~%" (total *marks*))
(format t "Average: ~,1f~%" (/ (total *marks*) (length *marks*)))
