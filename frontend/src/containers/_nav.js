export default [
  {
    _name: 'CSidebarNav',
    _children: [
      {
        _name: 'CSidebarNavItem',
        name: 'Dashboard',
        to: '/dashboard',
        icon: 'cil-speedometer'
      },
      {
        _name: 'CSidebarNavTitle',
        _children: ['Menu-Title']
      },
      {
        _name: 'CSidebarNavDropdown',
        name: 'Menu1',
        route: '/Menu1',
        icon: 'cil-puzzle',
        items: [
          {
            name: 'Submenu1',
            to: '/base/submenu1',
            badge: {
              color: 'primary',
              text: 'NEW',
              shape: 'pill'
            }
          }
        ]
      },
      {
        _name: 'CSidebarNavDivider',
        _class: 'm-2'
      },
      {
        _name: 'CSidebarNavItem',
        name: 'Login',
        to: '/pages/login',
        icon: 'cil-puzzle'
      }
    ]
  }
]