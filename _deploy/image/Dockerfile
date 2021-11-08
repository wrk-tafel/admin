FROM docker:20.10.10-dind-alpine3.14

RUN apk add openssh-client
RUN eval $(ssh-agent -s)
RUN echo "$SSH_PRIVATE_KEY" | tr -d '\r' | ssh-add -
RUN mkdir -p ~/.ssh
RUN chmod 700 ~/.ssh
