/**
 * Support contact - mails in-app support requests to the deployment's support address, and logs
 * client-side errors reported by the browser as they happen.
 */
@org.springframework.modulith.ApplicationModule(
        allowedDependencies = {"base::exception"}
)
package at.wrk.tafel.admin.backend.modules.support;
