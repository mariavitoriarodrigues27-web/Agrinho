// BANCO DE DADOS LOCAL (Inicia totalmente limpo e vazio para você cadastrar)
let rebanho = JSON.parse(localStorage.getItem('AGRO_TECH_SJP_REBANHO')) || [];

document.addEventListener("DOMContentLoaded", () => {
    configurarNavegacao();
    renderDate();
    buscarMercadoReal();
    initChartIBGE();
    renderRebanho();
    atualizarClimaFakeReal();

    // Vinculação de Operações do Sistema
    document.getElementById('btn-calcular').addEventListener('click', calcularCalagem);
    document.getElementById('btn-add-animal').addEventListener('click', adicionarAnimal);
    document.getElementById('btn-exportar').addEventListener('click', exportarParaCSV);
});

// Logs do Sistema
function addLog(mensagem) {
    const lista = document.getElementById('log-list');
    const item = document.createElement('li');
    item.innerText = `[${new Date().toLocaleTimeString()}] ${mensagem}`;
    lista.prepend(item);
}

// Persistência de dados
function salvarDados() {
    localStorage.setItem('AGRO_TECH_SJP_REBANHO', JSON.stringify(rebanho));
}

// Controle de Navegação de Abas
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
                addLog(`Módulo AgroTech: ${alvoTab.toUpperCase()}`);
            }
        });
    });
}

function renderDate() {
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    document.getElementById('current-date').innerText = new Date().toLocaleDateString('pt-BR', options);
}

// COTAÇÃO FINANCEIRA EM TEMPO REAL
async function buscarMercadoReal() {
    const ticker = document.getElementById('quotes-ticker');
    try {
        const response = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL');
        const dados = await response.json();
        
        const usd = dados.USDBRL;
        const trendIcon = parseFloat(usd.pctChange) >= 0 ? "↑" : "↓";

        // Atualiza os Tickers de Cotação
        ticker.innerHTML = `
            <span style="margin-right: 50px;">💵 <strong>DÓLAR COMERCIAL:</strong> R$ ${parseFloat(usd.bid).toFixed(2)} (${usd.pctChange}%)</span>
            <span style="margin-right: 50px;">🇪🇺 <strong>EURO:</strong> R$ ${parseFloat(dados.EURBRL.bid).toFixed(2)}</span>
            <span style="margin-right: 50px;">🌾 <strong>AGROTECH SÃO JOSÉ:</strong> Conectado com o mercado financeiro em tempo real.</span>
        `;

        // Atualiza KPI na Dashboard Principal
        document.getElementById('kpi-dolar').innerText = `R$ ${parseFloat(usd.bid).toFixed(2)}`;
        const trendEl = document.getElementById('kpi-dolar-trend');
        trendEl.innerText = `${trendIcon} Var: ${usd.pctChange}%`;
        trendEl.className = `kpi-trend ${parseFloat(usd.pctChange) >= 0 ? 'up' : 'down'}`;
        
        addLog("Mercados financeiros atualizados.");
    } catch (error) {
        ticker.innerHTML = "Falha na conexão com servidores de câmbio.";
    }
}

// GRÁFICO HISTÓRICO CONECTADO DIRETAMENTE AO IBGE (SIDRA)
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
        const anos = Object.keys(serieTemporal);

        agroChart.data.labels = anos;
        agroChart.data.datasets[0].data = valoresProducao;
        agroChart.update();
        addLog("Gráfico alimentado via API oficial do IBGE.");
    } catch (e) {
        addLog("Servidor do IBGE instável. Rodando dados locais em cache.");
    }
}

// CÁLCULO DE CALAGEM OFICIAL (MÉTODO EMBRAPA)
function calcularCalagem() {
    const ctc = parseFloat(document.getElementById('ctc').value);
    const v1 = parseFloat(document.getElementById('v1').value);
    const v2 = parseFloat(document.getElementById('v2').value);
    const prnt = parseFloat(document.getElementById('prnt').value);
    const resultadoBox = document.getElementById('resultado-calagem');

    if (v2 <= v1) {
        resultadoBox.innerHTML = "⚠️ <strong>Erro Operacional:</strong> A saturação pretendida (V2) precisa ser superior à atual do solo (V1).";
        resultadoBox.classList.remove('hidden');
        return;
    }

    const nc = ((v2 - v1) * ctc) / prnt;
    resultadoBox.innerHTML = `🔬 <strong>Resultado Técnico:</strong> Recomendação de Calagem = <strong>${nc.toFixed(2)} toneladas por hectare (t/ha)</strong>.<br><small>Distribuição uniforme recomendada incorporando de 0 a 20cm de profundidade.</small>`;
    resultadoBox.classList.remove('hidden');
    addLog(`Cálculo de calagem executado: ${nc.toFixed(2)} t/ha.`);
}

// GESTÃO DE REBANHO
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

    if(!id || !weight) {
        alert("Preencha todos os campos do animal.");
        return;
    }

    rebanho.push({ id, breed, weight });
    renderRebanho();
    addLog(`Entrada de animal salva: ${id}`);

    document.getElementById('animal-id').value = "";
    document.getElementById('animal-weight').value = "";
}

function removerAnimal(index) {
    const idRemovido = rebanho[index].id;
    rebanho.splice(index, 1);
    renderRebanho();
    addLog(`Animal deletado: ${idRemovido}`);
}

// EXPORTAÇÃO DE RELATÓRIO
function exportarParaCSV() {
    let csvContent = "data:text/csv;charset=utf-8,Identificador,Raca,Peso(kg)\n";
    rebanho.forEach(animal => {
        csvContent += `${animal.id},${animal.breed},${animal.weight}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agro_tech_sjp_rebanho.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addLog("Relatório exportado para planilha Excel/CSV.");
}

function atualizarClimaFakeReal() {
    const agora = new Date().getHours();
    let temp = agora > 18 || agora < 6 ? "14°C" : "22°C"; // Temperaturas mais próximas do clima de SJP-PR
    document.querySelector('.weather-temp').innerText = temp;
}