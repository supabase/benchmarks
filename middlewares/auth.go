package middlewares

import (
	"github.com/labstack/echo/v5"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/models"
	"github.com/pocketbase/pocketbase/tools/rest"
)

// RequireAdminOrPrivilegedAuth middleware requires a request to have
// a valid admin or privileged user Authorization header set
// (aka. `Authorization: Admin ...` or `Authorization: User ...` with role - privileged).
func RequireAdminOrPrivilegedAuth() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			admin, _ := c.Get(apis.ContextAdminKey).(*models.Admin)
			user, _ := c.Get(apis.ContextUserKey).(*models.User)

			if user != nil && user.Profile.GetStringDataValue("role") != "privileged" {
				user = nil // just assign nil to user cause only privileged users can access this endpoint
			}

			if admin == nil && user == nil {
				return rest.NewUnauthorizedError("The request requires admin or privileged user authorization token to be set.", nil)
			}

			return next(c)
		}
	}
}
