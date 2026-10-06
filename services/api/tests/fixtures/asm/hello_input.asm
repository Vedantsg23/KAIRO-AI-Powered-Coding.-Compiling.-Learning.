section .data
    greet db "Hello, "
    greet_len equ $ - greet

section .bss
    name resb 32

section .text
    global _start
_start:
    mov rax, 0          ; read(0, name, 32)
    mov rdi, 0
    mov rsi, name
    mov rdx, 32
    syscall
    mov r12, rax        ; number of bytes read

    mov rax, 1          ; write(1, greet, greet_len)
    mov rdi, 1
    mov rsi, greet
    mov rdx, greet_len
    syscall

    mov rax, 1          ; write(1, name, r12)
    mov rdi, 1
    mov rsi, name
    mov rdx, r12
    syscall

    mov rax, 60         ; exit(0)
    xor rdi, rdi
    syscall
