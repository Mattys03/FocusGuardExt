# FocusGuard - Extensão de Produtividade (Chrome)

<div align="center">
  <a href="https://github.com/Mattys03/FocusGuardExt/releases/latest">
    <img src="https://img.shields.io/badge/📦_Download_Release-4285F4?style=for-the-badge&logo=googlechrome" alt="Download Release" />
  </a>
</div>

![Platform](https://img.shields.io/badge/Plataforma-Google%20Chrome-blue)
![Tech](https://img.shields.io/badge/Tecnologia-Manifest%20V3%20%7C%20JavaScript-green)
![License](https://img.shields.io/badge/Licen%C3%A7a-MIT-purple)

**FocusGuard** é uma extensão robusta de produtividade construída sob o padrão **Manifest V3** da Chrome Web Store. Ela foi arquitetada para bloquear distrações online e garantir sessões de "Deep Work" (Foco Profundo) utilizando recursos avançados de *Service Workers* em background e manipulação em tempo real da árvore DOM (Document Object Model).

## 🚀 Funcionalidades Principais

- **Bloqueio de Distrações:** Intercepta e barra requisições para domínios classificados como perda de tempo.
- **Arquitetura Manifest V3:** Código estritamente alinhado com as políticas de segurança, privacidade e performance (baixo consumo de memória) impostas pelo Google para 2024+.
- **Processamento em Service Workers:** Mantém *listeners* assíncronos eficientes trabalhando em segundo plano sem impactar o desempenho do navegador.
- **Injeção de Código (Content Scripts):** Aplica regras de CSS e lógicas JavaScript ativamente nas abas carregadas para esconder elementos específicos.
- **Popup UI Intuitivo:** Painel de controle simples e limpo, gerenciado pelo ícone da extensão para controle rápido das regras.

## 🛠️ Arquitetura

- **`manifest.json`**: O núcleo de regras da extensão, responsável por habilitar as permissões de `declarativeNetRequest`, `storage`, e `activeTab`.
- **`background.js`**: O Worker que lida com o roteamento, monitoramento de abas e controle de alarmes de tempo.
- **`content.js` & `content.css`**: Arquivos de linha de frente, injetados dinamicamente para transformar o visual e bloquear gatilhos visuais das páginas proibidas.
- **`popup/`**: Interface modular (HTML, JS, CSS) ativada apenas durante o clique do usuário, liberando memória logo em seguida.

## 📦 Instalação Manual (Modo Desenvolvedor)

1. Faça o Download da versão mais recente na aba de Releases (botão acima) e extraia o `.zip`.
2. Acesse a barra de endereços do Google Chrome e digite: `chrome://extensions/`.
3. No canto superior direito, ative a chave do **Modo do desenvolvedor** (Developer mode).
4. Clique no botão **Carregar sem compactação** (Load unpacked).
5. Selecione a pasta onde você extraiu o arquivo `FocusGuardExt`. A extensão aparecerá na sua barra de ferramentas pronta para uso!

## 📝 Licença

Distribuído sob a Licença MIT.
