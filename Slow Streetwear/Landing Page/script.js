function startTimer(duration, display) {
    let timer = duration, hours, minutes, seconds;
    setInterval(function () {
        hours = parseInt(timer / 3600, 10);
        minutes = parseInt((timer % 3600) / 60, 10);
        seconds = parseInt(timer % 60, 10);

        hours = hours < 10 ? "0" + hours : hours;
        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        display.textContent = hours + ":" + minutes + ":" + seconds;

        if (--timer < 0) {
            timer = 0; // Para no zero quando o drop encerrar
        }
    }, 1000);
}

window.onload = function () {
    let duration = 24 * 60 * 60; // 24 horas em segundos
    let display = document.querySelector('#timer');
    startTimer(duration, display);
};