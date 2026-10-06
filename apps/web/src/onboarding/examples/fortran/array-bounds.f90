program main
  implicit none
  integer :: a(3), i
  do i = 1, 4
    a(i) = i * 2
  end do
  print *, a
end program main
