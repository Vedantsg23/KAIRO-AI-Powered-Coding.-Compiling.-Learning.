section .text
    global _start
_start:
    mov rax, [0]        ; read from address 0
    mov rax, 60
    xor rdi, rdi
    syscall
