! Welcome to Fortran! Press Run (Ctrl+Enter) to compile and run this program.
! Array bounds are checked while it runs (gfortran -fcheck=all).
program scores
  implicit none
  integer :: marks(5) = [72, 88, 95, 64, 81]
  integer :: total

  total = sum(marks)
  print '(A, I0)', 'Total: ', total
  print '(A, F0.1)', 'Average: ', real(total) / size(marks)
end program scores
