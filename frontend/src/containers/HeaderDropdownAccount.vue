<template>
  <CDropdown inNav class="c-header-nav-items" placement="bottom-end" add-menu-classes="pt-0">
    <template #toggler>
      <CHeaderNavLink>
        <div class="c-avatar">
          <CIcon name="cil-user" size="2xl" />
        </div>
      </CHeaderNavLink>
    </template>
    <CDropdownItem>
      <CIcon name="cil-lock-locked" />Abmelden
    </CDropdownItem>
  </CDropdown>
</template>

<script>
export default {
  name: "HeaderDropdownAccount"
};
</script>

<style scoped>
.c-icon {
  margin-right: 0.3rem;
}
</style>