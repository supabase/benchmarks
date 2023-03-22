package migrations

import (
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/daos"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/models/schema"
)

func init() {
	m.Register(func(db dbx.Builder) error {
		dao := daos.New(db)

		c, err := dao.FindCollectionByNameOrId("runs")
		if err != nil {
			return err
		}
		c.Schema.AddField(&schema.SchemaField{
			Name:    "vars",
			Type:    schema.FieldTypeJson,
			Options: &schema.JsonOptions{},
		})

		return dao.SaveCollection(c)
	}, func(db dbx.Builder) error {
		dao := daos.New(db)

		c, err := dao.FindCollectionByNameOrId("runs")
		if err != nil {
			return err
		}

		f := c.Schema.GetFieldByName("vars")
		c.Schema.RemoveField(f.Id)

		return dao.SaveCollection(c)
	}, "migrations/1675264133_add_vars_to_run.go")
}
