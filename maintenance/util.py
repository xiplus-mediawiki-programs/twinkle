def findBetween(text, start, end):
    idx1 = text.index(start)
    idx2 = text.index(end)
    return text[idx1 + len(start):idx2]
