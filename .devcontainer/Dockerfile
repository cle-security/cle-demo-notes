FROM node:lts

USER root
RUN apt-get update && apt-get install -y zsh starship zstd && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /home/node/.zsh_history_dir && chown node:node /home/node/.zsh_history_dir

USER node
RUN curl -fsSL https://claude.ai/install.sh | bash \
    && echo 'eval "$(starship init zsh)"' >> ~/.zshrc \
    && echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
