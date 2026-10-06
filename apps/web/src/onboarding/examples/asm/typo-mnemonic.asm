section .text
    global _start
_start:
    mvo rax, 60
    xor rdi, rdi
    syscall
