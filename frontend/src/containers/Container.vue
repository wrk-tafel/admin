<template>
  <div class="c-app">
    <Sidebar />
    <CWrapper>
      <Header />
      <div class="c-body">
        <main class="c-main">
          <CContainer fluid>
            <transition name="fade" mode="out-in">
              <router-view :key="$route.path"></router-view>
            </transition>
          </CContainer>
        </main>
      </div>
      <Footer />
    </CWrapper>
  </div>
</template>

<script>
import Sidebar from "./Sidebar";
import Header from "./Header";
import Footer from "./Footer";

export default {
  name: "Container",
  components: {
    Sidebar,
    Header,
    Footer
  }
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}
</style>
