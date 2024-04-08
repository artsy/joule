from freezegun import freeze_time
from utils.is_retro_today import is_retro_today


@freeze_time("2024-04-11")
def test_is_retro_today_returns_false_when_not_retro():
    assert not is_retro_today()


@freeze_time("2024-04-18")
def test_is_retro_today_returns_true_when_retro():
    assert is_retro_today()
