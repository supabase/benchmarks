package models

type NewRun struct {
	Run
	GitHubPRLink string `json:"pr_link"`
}
