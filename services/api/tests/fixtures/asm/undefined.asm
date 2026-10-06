section .text
    global _start
_start:
    call helper
    mov rax, 60
    xor rdi, rdi
    syscall
