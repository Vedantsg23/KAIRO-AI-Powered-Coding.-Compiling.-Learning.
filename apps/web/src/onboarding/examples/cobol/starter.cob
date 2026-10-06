      * Welcome to COBOL! Press Run (Ctrl+Enter) to compile and run.
      * Fixed form: code starts in column 8; '*' in column 7 is a comment.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. SCORES.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01 WS-MARKS.
          05 WS-MARK PIC 9(3) OCCURS 5 TIMES.
       01 WS-I       PIC 9 VALUE 1.
       01 WS-TOTAL   PIC 9(4) VALUE 0.
       01 WS-AVERAGE PIC ZZ9.9.
       PROCEDURE DIVISION.
           MOVE 72 TO WS-MARK(1).
           MOVE 88 TO WS-MARK(2).
           MOVE 95 TO WS-MARK(3).
           MOVE 64 TO WS-MARK(4).
           MOVE 81 TO WS-MARK(5).
           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > 5
               ADD WS-MARK(WS-I) TO WS-TOTAL
           END-PERFORM.
           DISPLAY "Total: " WS-TOTAL.
           COMPUTE WS-AVERAGE = WS-TOTAL / 5.
           DISPLAY "Average: " WS-AVERAGE.
           STOP RUN.
