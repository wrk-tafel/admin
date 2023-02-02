describe('Scanner', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('connections initialized successfully and result sent', () => {
    cy.visit('/#/anmeldung/scanner');

    // to be safe having the ws-connection established and the webcam ready
    cy.wait(250);

    cy.byTestId('state-server').should('have.class', 'badge-success');
    cy.byTestId('state-camera').should('have.class', 'badge-success');
    cy.byTestId('scanner-id').should('have.text', '1');

    /*
    // TODO assert ws-data
    const config: WebSocketSubjectConfig<IMessage> = {
      url: 'ws://localhost:4500/api/websockets'
    };
    const options: Partial<StreamRequestOptions<IMessage>> = {};

    cy.streamRequest<IMessage>(config, options).then((results?: IMessage[]) => {
      // tslint:disable-next-line:no-unused-expression
      expect(results).to.not.be.undefined;
    });
     */
  });

});
