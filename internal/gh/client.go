package gh

import (
	"context"
	"database/sql"
	"fmt"
	"strconv"
	"strings"

	"github.com/google/go-github/v64/github"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
	"github.com/supabase/supabench/models"
)

type Client struct {
	client *github.Client
	PB     *pocketbase.PocketBase
}

func New(pb *pocketbase.PocketBase) *Client {
	token := viper.GetString("GITHUB_TOKEN")
	if token == "" {
		log.Warn().Msg("GITHUB_TOKEN is not set, no GitHub API access")
		return &Client{
			PB: pb,
		}
	}
	client := github.NewClient(nil).WithAuthToken(token)

	return &Client{
		client: client,
		PB:     pb,
	}
}

func (c *Client) GetPRLinkByID(id string) (string, error) {
	pr := models.PR{}
	if err := c.PB.DB().
		Select().
		Where(dbx.HashExp{"id": id}).
		One(&pr); err != nil {
		return "", err
	}
	return *pr.PRLink, nil
}

func (c *Client) AddOrUpdateComment(ctx context.Context, prlink string, comment string) error {
	if c.client == nil {
		return fmt.Errorf("GitHub client is not initialized correctly")
	}

	pr := models.PR{
		GHComment: &comment,
		PRLink:    &prlink,
	}
	if err := c.PB.DB().
		Select().
		Where(dbx.HashExp{"pr_link": prlink}).
		One(&pr); err != nil {
		if err == sql.ErrNoRows {
			pr.GHComment = &comment
			pr.PRLink = &prlink
			pr.RefreshId()
			pr.RefreshCreated()
			pr.RefreshUpdated()
			err := c.PB.DB().Model(&pr).Insert()
			if err != nil {
				return fmt.Errorf("error inserting pr: %w", err)
			}
		} else {
			return fmt.Errorf("error getting pr: %w", err)
		}
	}

	owner, repo, prNumber, err := parsePRLink(prlink)
	if err != nil {
		return fmt.Errorf("error parsing PR link: %w", err)
	}

	if pr.GHCommentLink == nil {
		prc, _, err := c.client.PullRequests.CreateComment(
			ctx,
			owner,
			repo,
			prNumber,
			&github.PullRequestComment{
				Body: github.String(*pr.GHComment),
			},
		)
		if err != nil {
			return fmt.Errorf("error creating PR comment: %w", err)
		}
		pr.GHCommentLink = prc.URL
	} else {
		commentID, err := parseCommentLink(*pr.GHCommentLink)
		if err != nil {
			return fmt.Errorf("error parsing comment link: %w", err)
		}
		_, _, err = c.client.PullRequests.EditComment(
			ctx,
			owner,
			repo,
			commentID,
			&github.PullRequestComment{
				Body: github.String(*pr.GHComment),
			},
		)
		if err != nil {
			return fmt.Errorf("error editing PR comment: %w", err)
		}
	}

	pr.RefreshUpdated()
	if err := c.PB.DB().Model(&pr).Update(); err != nil {
		return fmt.Errorf("error updating PR in the database: %w", err)
	}

	return nil
}

func parsePRLink(prlink string) (string, string, int, error) {
	// Example PR link: https://github.com/owner/repo/pulls/123
	prlink = strings.TrimPrefix(prlink, "https://")
	parts := strings.Split(prlink, "/")
	if len(parts) < 5 {
		return "", "", 0, fmt.Errorf("invalid PR link format")
	}

	owner := parts[1]
	repo := parts[2]
	prNumber, err := strconv.Atoi(parts[4])
	if err != nil {
		return "", "", 0, fmt.Errorf("invalid PR number: %w", err)
	}

	return owner, repo, prNumber, nil
}

func parseCommentLink(commentlink string) (int64, error) {
	// Example comment link: https://api.github.com/repos/octocat/Hello-World/pulls/comments/1
	parts := strings.Split(commentlink, "/")
	if len(parts) < 7 {
		return 0, fmt.Errorf("invalid comment link format")
	}

	commentID, err := strconv.ParseInt(parts[6], 10, 64)
	if err != nil {
		return 0, fmt.Errorf("invalid comment number: %w", err)
	}

	return commentID, nil
}

func InProgressCommentString(grafanaLink string) string {
	return fmt.Sprintf(`
🚀 **Benchmark Run Triggered!** 🚀

Your benchmark run has been triggered and is now in progress. Please be patient as this may take some time to spin up the machines and prepare the environment.

🔗 [View Results on Grafana](%s)

Stay tuned for updates! 📊✨
`, grafanaLink)
}

func SuccessCommentString(grafanaLink string, mdResult string) string {
	return fmt.Sprintf(
		"✅ **Benchmark Run Completed Successfully!** ✅\n\n"+

			"🔗 [View Results on Grafana](%s)\n\n"+
			"**Summary:**\n"+
			"```\n"+
			"%s\n"+
			"```",
		grafanaLink, mdResult)
}

func FailureCommentString(grafanaLink string, mdResult string) string {
	return fmt.Sprintf(
		"❌ **Benchmark Run Failed!** ❌\n\n"+
			"🔗 [View Results on Grafana](%s)\n\n"+
			"**Summary:**\n"+
			"```\n"+
			"%s\n"+
			"```",
		grafanaLink, mdResult)
}

func SmthWentWrongCommentString() string {
	return fmt.Sprint(
		"❌ **Something Went Wrong!** ❌\n\n" +
			"Please check the terraform and supabench logs for more details and contact admin to find out what happened.")
}
