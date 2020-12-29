<template>
  <div class="c-app flex-row align-items-center">
    <CContainer>
      <CRow class="justify-content-center">
        <CCol md="8">
          <CCard class="p-4">
            <CCardBody>
              <CForm>
                <CRow>
                  <CCol col="6" class="align-items-center">
                    <CIcon
                      class="c-sidebar-brand-full"
                      name="logo"
                      size="custom-size"
                      :height="80"
                      :width="250"
                      viewBox="0 0 1624 440"
                      style="background-color: white;"
                    />
                  </CCol>
                </CRow>
                <h1>Tafel 1030 - Anmeldung</h1>
                <CInput placeholder="Benutzername" autocomplete="username email">
                  <template #prepend-content>
                    <CIcon name="cil-user" />
                  </template>
                </CInput>
                <CInput placeholder="Passwort" type="password" autocomplete="curent-password">
                  <template #prepend-content>
                    <CIcon name="cil-lock-locked" />
                  </template>
                </CInput>
                <CRow>
                  <CCol col="6" class="text-left">
                    <CButton color="primary" class="px-4">Anmelden</CButton>
                  </CCol>
                </CRow>
              </CForm>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </CContainer>
  </div>
</template>

<script>
export default {
  name: "Login"
};
</script>
