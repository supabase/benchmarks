package pipelines

import (
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/models"
	"github.com/supabase/supabench/internal/execution"
)

func InitUser(app *execution.App) {
	app.PB.OnUserBeforeUpdateRequest().Add(func(e *core.UserUpdateEvent) error {
		// only admin may change user's role
		if e.User.Profile == nil {
			return nil
		}
		admin, _ := e.HttpContext.Get(apis.ContextAdminKey).(*models.Admin)
		val := e.User.Profile.GetDataValue("role")
		if val == "privileged" && admin == nil {
			e.User.Profile.SetDataValue("role", "viewer")
		}
		return nil
	})
	app.PB.OnUserBeforeCreateRequest().Add(func(e *core.UserCreateEvent) error {
		if e.User.Profile == nil {
			return nil
		}
		val := e.User.Profile.GetDataValue("role")
		if val == "privileged" {
			e.User.Profile.SetDataValue("role", "viewer")
		}
		return nil
	})

	app.PB.OnRecordBeforeUpdateRequest().Add(func(e *core.RecordUpdateEvent) error {
		if e.Record.TableName() != "profiles" {
			return nil
		}
		// only admin may change user's role
		admin, _ := e.HttpContext.Get(apis.ContextAdminKey).(*models.Admin)
		val := e.Record.GetDataValue("role")
		if val == "privileged" && admin == nil {
			e.Record.SetDataValue("role", "viewer")
		}
		return nil
	})
	app.PB.OnRecordBeforeCreateRequest().Add(func(e *core.RecordCreateEvent) error {
		if e.Record.TableName() != "profiles" {
			return nil
		}
		val := e.Record.GetDataValue("role")
		if val == "privileged" {
			e.Record.SetDataValue("role", "viewer")
		}
		return nil
	})
}
