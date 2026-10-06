program hello
  implicit none
  character(len=40) :: name
  read(*, '(A)') name
  print '(A, A, A)', 'Hello, ', trim(name), '!'
end program hello
