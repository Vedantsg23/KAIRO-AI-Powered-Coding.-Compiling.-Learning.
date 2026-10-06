; Welcome to x86-64 assembly (NASM, Linux)! Press Run (Ctrl+Enter) to
; assemble, link and run this program. It adds five marks and prints the
; total with Linux system calls (1 = write, 60 = exit).

section .data
    marks       dq 72, 88, 95, 64, 81
    count       equ 5
    label       db "Total: "
    label_len   equ $ - label

section .bss
    digits      resb 20

section .text
    global _start

_start:
    xor rax, rax                ; rax = total
    xor rcx, rcx                ; rcx = index
.sum:
    add rax, [marks + rcx*8]
    inc rcx
    cmp rcx, count
    jl .sum

    lea rsi, [digits + 20]      ; write the digits right to left
    dec rsi
    mov byte [rsi], 10          ; newline
    mov rbx, 10
.digit:
    xor rdx, rdx
    div rbx                     ; rax = rax / 10, rdx = remainder
    add dl, '0'
    dec rsi
    mov [rsi], dl
    test rax, rax
    jnz .digit
    mov r12, rsi                ; first digit

    mov rax, 1                  ; write(1, label, label_len)
    mov rdi, 1
    mov rsi, label
    mov rdx, label_len
    syscall

    mov rax, 1                  ; write(1, digits, length)
    mov rdi, 1
    mov rsi, r12
    lea rdx, [digits + 20]
    sub rdx, r12
    syscall

    mov rax, 60                 ; exit(0)
    xor rdi, rdi
    syscall
