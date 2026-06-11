let rebanho = JSON.parse(localStorage.getItem('AGRO_TECH_SJP_REBANHO')) || [];
let currentFontSize = 16; // Tamanho base em pixels

document.addEventListener("DOMContentLoaded", () => {
    configurarNavegacao();
    renderDate();
    buscarMercadoReal();
    initChartIBGE();
    renderRebanho();
    atualizarClimaFakeReal();
    configurarAcessibilidade(); // Liga os novos recursos

    // Vinculação de Operações
    document.getElementById('btn-calcular').addEventListener('click', calcularCalagem);
    document.getElementById('btn-add-animal').addEventListener('click', adicionarAnimal);
    document.getElementById('btn-exportar').addEventListener('click', exportarParaCSV);
});

// MOTOR DE ACESSIBILIDADE (Zoom e Leitura em Voz Alta)
function configurarAcessibilidade() {
    // Zoom In (Aumentar)
    document.getElementById('btn-zoom-in').addEventListener('click', () => {
        if (currentFontSize < 24) {
            currentFontSize += 2;
            document.documentElement.style.setProperty('--base-font-size', `${currentFontSize}px`);
            addLog("Tamanho do texto aumentado.");
        }
    });

    // Zoom Out (Diminuir)
    document.getElementById('btn-zoom-out').addEventListener('click', () => {
        if (currentFontSize > 12) {
            currentFontSize -= 2;
            document.documentElement.style.setProperty('--base-font-size', `${currentFontSize}px`);
            addLog("Tamanho do texto reduzido.");
        }
    });

    // Leituras de Tela (Text-to-Speech)
    const btnTts = document.getElementById('btn-tts');
    btnTts.addEventListener('click', () => {
        // Se já estiver lendo, cancela a voz
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            btnTts.innerText = "🔊 Ouvir Página";
            addLog("Leitura de voz interrompida.");
            return;
        }

        // Pega o texto limpo apenas da aba que está visível na tela
        const abaAtiva = document.querySelector('.tab-content.active');
        if (!abaAtiva) return;

        const textoParaLer = abaAtiva.innerText;
        const sotaqueUnico = new SpeechSynthesisUtterance(textoParaLer);
        sotaqueUnico.lang = 'pt-BR'; // Define a voz para português do Brasil

        sotaqueUnico.onend = () => { btnTts.innerText = "🔊 Ouvir Página"; };

        window.speechSynthesis.speak(sotaqueUnico);
        btnTts.innerText = "🛑 Parar Leitura";
        addLog("Iniciou leitura de tela em voz alta.");
    });
}

function addLog(mensagem) {
    const lista = document.getElementById('log-list');
    if(lista) {
        const item = document.createElement('li');
        item.innerText = `[${new Date().toLocaleTimeString()}] ${mensagem}`;
        lista.prepend(item);
    }
}

function salvarDados() {
    localStorage.setItem('AGRO_TECH_SJP_REBANHO', JSON.stringify(rebanho));
}

function configurarNavegacao() {
    const botoes = document.querySelectorAll('.menu-btn');
    const abas = document.querySelectorAll('.tab-content');

    botoes.forEach(botao => {
        botao.addEventListener('click', () => {
            const alvoTab = botao.getAttribute('data-tab');
            botoes.forEach(b => b.classList.remove('active'));
            abas.forEach(a => a.classList.remove('active'));

            botao.classList.add('active');
            const abaAlvo = document.getElementById(alvoTab);
            if (abaAlvo) {
                abaAlvo.classList.add('active');
                if (window.speechSynthesis.speaking) window.speechSynthesis.cancel(); // Para a voz se trocar de aba
                addLog(`Módulo AgroTech: ${alvoTab.toUpperCase()}`);
            }
        });
    });
}

function renderDate() {
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    document.getElementById('current-date').innerText = new Date().toLocaleDateString('pt-BR', options);
}

async function buscarMercadoReal() {
    const ticker = document.getElementById('quotes-ticker');
    try {
        const response = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL');
        const dados = await response.json();
        const usd = dados.USDBRL;
        const trendIcon = parseFloat(usd.pctChange) >= 0 ? "↑" : "↓";

        ticker.innerHTML = `
            <span style="margin-right: 50px;">💵 <strong>DÓLAR:</strong> R$ ${parseFloat(usd.bid).toFixed(2)} (${usd.pctChange}%)</span>
            <span style="margin-right: 50px;">🇪🇺 <strong>EURO:</strong> R$ ${parseFloat(dados.EURBRL.bid).toFixed(2)}</span>
        `;

        document.getElementById('kpi-dolar').innerText = `R$ ${parseFloat(usd.bid).toFixed(2)}`;
        const trendEl = document.getElementById('kpi-dolar-trend');
        trendEl.innerText = `${trendIcon} Var: ${usd.pctChange}%`;
        trendEl.className = `kpi-trend ${parseFloat(usd.pctChange) >= 0 ? 'up' : 'down'}`;
    } catch (error) {
        ticker.innerHTML = "Falha de conexão com os mercados.";
    }
}

async function initChartIBGE() {
    const ctx = document.getElementById('prodChart').getContext('2d');
    const agroChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['2019', '2020', '2021', '2022', '2023', '2024'],
            datasets: [{
                label: 'Produção Brasileira de Soja (Milhões de Toneladas)',
                data: [114.2, 121.7, 134.9, 119.4, 154.6, 147.3],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#f8fafc' } } },
            scales: {
                x: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } }
            }
        }
    });

    try {
        const response = await fetch("https://servicodados.ibge.gov.br/api/v3/agregados/1612/periodos/2019|2020|2021|2022|2023|2024/variaveis/214?localidades=N1[all]&classificacao=31[39438]");
        const dados = await response.json();
        const serieTemporal = dados[0].resultados[0].series[0].serie;
        const valoresProducao = Object.values(serieTemporal).map(valor => parseFloat(valor) / 1000000); 
        agroChart.data.datasets[0].data = valoresProducao;
        agroChart.update();
    } catch (e) {
        console.log("Erro na API do IBGE.");
    }
}

function calcularCalagem() {
    const ctc = parseFloat(document.getElementById('ctc').value);
    const v1 = parseFloat(document.getElementById('v1').value);
    const v2 = parseFloat(document.getElementById('v2').value);
    const prnt = parseFloat(document.getElementById('prnt').value);
    const resultadoBox = document.getElementById('resultado-calagem');

    if (v2 <= v1) {
        resultadoBox.innerHTML = "⚠️ Saturação desejada inválida.";
        resultadoBox.classList.remove('hidden');
        return;
    }

    const nc = ((v2 - v1) * ctc) / prnt;
    resultadoBox.innerHTML = `🔬 <strong>Resultado Técnico:</strong> Recomendação = <strong>${nc.toFixed(2)} t/ha</strong>.`;
    resultadoBox.classList.remove('hidden');
}

function renderRebanho() {
    const tbody = document.getElementById('cattle-table-body');
    tbody.innerHTML = "";
    rebanho.forEach((animal, index) => {
        tbody.innerHTML += `
            <tr>
                <td><strong>🆔 ${animal.id}</strong></td>
                <td>${animal.breed}</td>
                <td>${animal.weight} kg</td>
                <td><span style="color: #10b981">● Saudável</span></td>
                <td><button class="btn-delete" onclick="removerAnimal(${index})">Deletar</button></td>
            </tr>
        `;
    });
    document.getElementById('total-cattle-kpi').innerText = rebanho.length;
    salvarDados();
}

function adicionarAnimal() {
    const id = document.getElementById('animal-id').value.trim().toUpperCase();
    const breed = document.getElementById('animal-breed').value;
    const weight = parseFloat(document.getElementById('animal-weight').value);

    if(!id || !weight) return;
    rebanho.push({ id, breed, weight });
    renderRebanho();
    document.getElementById('animal-id').value = "";
    document.getElementById('animal-weight').value = "";
}

function removerAnimal(index) {
    rebanho.splice(index, 1);
    renderRebanho();
}

function exportarParaCSV() {
    let csvContent = "data:text/csv;charset=utf-8,Identificador,Raca,Peso(kg)\n";
    rebanho.forEach(animal => { csvContent += `${animal.id},${animal.breed},${animal.weight}\n`; });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agro_tech_sjp_rebanho.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function atualizarClimaFakeReal() {
    const agora = new Date().getHours();
    document.querySelector('.weather-temp').innerText = agora > 18 || agora < 6 ? "14°C" : "22°C";
}