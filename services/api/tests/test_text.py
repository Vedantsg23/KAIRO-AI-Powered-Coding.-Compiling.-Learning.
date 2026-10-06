from app.analysis.text import SourceText, previous_line_end, to_utf16_column, token_range


def test_byte_columns_become_utf16_columns():
    line = 'printf("héllo 😀 %d", y);'
    byte_col = line.encode("utf-8").index(b"y") + 1
    assert to_utf16_column(line, byte_col, "byte") == len(line.encode("utf-16-le")) // 2 - 2


def test_codepoint_columns_become_utf16_columns():
    line = "x = '😀' + y"
    codepoint_col = line.index("y") + 1
    assert to_utf16_column(line, codepoint_col, "codepoint") == codepoint_col + 1  # emoji = 2 units


def test_missing_line_leaves_column_unchanged():
    assert to_utf16_column(None, 7, "byte") == 7


def test_token_range_covers_identifier():
    r = token_range(SourceText("    total += value;\n"), 1, 14)
    assert (r.start_column, r.end_column) == (14, 19)


def test_token_range_whole_line_when_column_unknown():
    r = token_range(SourceText("\n    return helper(2);\n"), 2, None)
    assert (r.start_line, r.start_column, r.end_column) == (2, 5, 22)


def test_token_range_for_unterminated_string_runs_to_end_of_line():
    r = token_range(SourceText('    printf("hello);\n'), 1, 12)
    assert (r.start_column, r.end_column) == (12, 20)


def test_previous_line_end_skips_blank_lines_and_comments():
    src = SourceText("int x = 5 // five\n\n    printf(x);\n")
    assert previous_line_end(src, 3) == (1, 10)


def test_previous_line_end_none_when_statement_is_complete():
    assert previous_line_end(SourceText("int x = 5;\nprintf(x);\n"), 2) is None
    assert previous_line_end(SourceText("int main(void) {\nfoo\n"), 2) is None
    assert previous_line_end(SourceText("#include <stdio.h>\nfoo\n"), 2) is None
