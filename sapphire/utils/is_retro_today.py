from datetime import datetime


def is_retro_today():
    start_date = datetime(2024, 4, 4)
    today = datetime.now()
    week_diff = (today - start_date).days / 7
    return week_diff % 2 == 0


if __name__ == "__main__":
    if is_retro_today():
        print("true")
    else:
        print("false")
